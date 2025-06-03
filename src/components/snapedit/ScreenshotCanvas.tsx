
"use client";

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, RefObject } from 'react';
import type { Tool } from './EditorToolbar';
import type { CropRect } from './SnapEditApp';

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
  radius?: number;
}

interface ScreenshotCanvasProps {
  image: HTMLImageElement | null;
  tool: Tool | null;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Annotation) => void;
  onRequestTextInput: (point: Point, canvasPosition: Point) => void;
  externalCanvasRef: RefObject<HTMLCanvasElement>; 
  cropPreviewRect: CropRect | null;
  onSetCropPreviewRect: (rect: CropRect | null) => void;
  newAnnotationColor: string; 
}

const LINE_WIDTH = 3;
const FONT_SIZE = 16;
const FONT_FAMILY = 'Inter, sans-serif';


export const ScreenshotCanvas = forwardRef<{ performCrop: (rect: CropRect) => Promise<HTMLImageElement | null>, getCanvas: () => HTMLCanvasElement | null }, ScreenshotCanvasProps>(
  ({ image, tool, annotations, onAddAnnotation, onRequestTextInput, externalCanvasRef, cropPreviewRect, onSetCropPreviewRect, newAnnotationColor }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [currentDrawing, setCurrentDrawing] = useState<Partial<Annotation> | null>(null);
    const [canvasSize, setCanvasSize] = useState<{width: number, height: number}>({width: 800, height: 600});

    useEffect(() => {
      if (externalCanvasRef && internalCanvasRef.current) {
        (externalCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = internalCanvasRef.current;
      }
    }, [externalCanvasRef]);


    useImperativeHandle(ref, () => ({
      performCrop: async (rect: CropRect) => {
        const canvas = internalCanvasRef.current;
        if (!canvas || !image) return null;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = rect.width;
        tempCanvas.height = rect.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (!tempCtx) return null;
        
        // Source rect is from the original image, destination is (0,0) on new temp canvas
        tempCtx.drawImage(
          image, // Using the original image ensures we're cropping from the source
          rect.x, rect.y, rect.width, rect.height, 
          0, 0, rect.width, rect.height             
        );
        
        return new Promise((resolve) => {
          const newImage = new Image();
          newImage.onload = () => resolve(newImage);
          newImage.onerror = () => resolve(null);
          newImage.src = tempCanvas.toDataURL();
        });
      },
      getCanvas: () => internalCanvasRef.current,
    }));

    const getMousePosition = (e: React.MouseEvent): Point => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
    
      const rect = canvas.getBoundingClientRect(); // Dimensions of the <canvas> element on screen
    
      // canvas.width and canvas.height are the bitmap resolution.
      // If an image is loaded, these are image.width and image.height.
      // If no image (placeholder), these are parent.clientWidth and parent.clientHeight (approx rect.width/height).
      const bitmapWidth = canvas.width;
      const bitmapHeight = canvas.height;
    
      const elementWidth = rect.width;   // CSS display width of the canvas element
      const elementHeight = rect.height; // CSS display height of the canvas element
    
      // Calculate how the bitmap is scaled to fit within the element (object-contain behavior)
      const scaleRatio = Math.min(elementWidth / bitmapWidth, elementHeight / bitmapHeight);
      
      // Dimensions of the bitmap as it's actually rendered on screen
      const renderedBitmapWidth = bitmapWidth * scaleRatio;
      const renderedBitmapHeight = bitmapHeight * scaleRatio;
    
      // Calculate the centering offsets (letterboxing)
      const offsetX = (elementWidth - renderedBitmapWidth) / 2;
      const offsetY = (elementHeight - renderedBitmapHeight) / 2;
    
      // Mouse position relative to the canvas element's top-left corner (CSS pixels)
      const mouseXInElement = e.clientX - rect.left;
      const mouseYInElement = e.clientY - rect.top;
    
      // Mouse position relative to the top-left of the *rendered bitmap content*
      const mouseXOnRenderedBitmap = mouseXInElement - offsetX;
      const mouseYOnRenderedBitmap = mouseYInElement - offsetY;
    
      // Scale these coordinates back to the original bitmap's resolution
      const finalX = mouseXOnRenderedBitmap / scaleRatio;
      const finalY = mouseYOnRenderedBitmap / scaleRatio;
    
      return {
        x: finalX,
        y: finalY,
      };
    };
    
    const getCanvasClickPosition = (e: React.MouseEvent): Point => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        // This returns coordinates relative to the canvas element's display box, unscaled.
        // Used for positioning the HTML textarea.
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };


    useEffect(() => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (image) {
        if (canvas.width !== image.width || canvas.height !== image.height) {
           canvas.width = image.width;
           canvas.height = image.height;
           setCanvasSize({width: image.width, height: image.height});
        }
      } else {
        const parent = canvas.parentElement;
        if (parent) {
            // For placeholder, set canvas bitmap to match its display size for 1:1 mapping
            const displayWidth = parent.clientWidth;
            const displayHeight = parent.clientHeight;
            if(canvas.width !== displayWidth || canvas.height !== displayHeight){
                canvas.width = displayWidth;
                canvas.height = displayHeight;
                setCanvasSize({width: displayWidth, height: displayHeight});
            }
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (image) {
        // Draw image to fill the canvas bitmap; browser handles scaling to display element
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = 'hsl(var(--card))';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'hsl(var(--muted-foreground))';
        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('Capture or load an image to begin editing.', canvas.width / 2, canvas.height / 2);
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      annotations.forEach(ann => drawAnnotation(ctx, ann));
      if (isDrawing && currentDrawing && startPoint) {
        drawAnnotation(ctx, { ...currentDrawing, x:startPoint.x, y:startPoint.y, id:'temp', color: newAnnotationColor } as Annotation, true);
      }
      
      if (tool === 'crop' && cropPreviewRect) {
        ctx.strokeStyle = 'hsla(var(--primary-hsl), 0.8)'; 
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(cropPreviewRect.x, cropPreviewRect.y, cropPreviewRect.width, cropPreviewRect.height);
        ctx.setLineDash([]);
      }

    }, [image, annotations, isDrawing, currentDrawing, startPoint, tool, cropPreviewRect, canvasSize, newAnnotationColor]);
    

    const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation, isPreview = false) => {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color; 
      ctx.lineWidth = LINE_WIDTH;

      switch (ann.type) {
        case 'rect':
          if (ann.width !== undefined && ann.height !== undefined) {
            ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
          }
          break;
        case 'circle':
          if (ann.radius !== undefined && ann.radius > 0) { // Ensure radius is positive
            ctx.beginPath();
            ctx.arc(ann.x, ann.y, ann.radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;
        case 'arrow':
          if (ann.endX !== undefined && ann.endY !== undefined) {
            ctx.beginPath();
            ctx.moveTo(ann.x, ann.y);
            ctx.lineTo(ann.endX, ann.endY);
            const headLength = 10 * (isPreview ? 0.8 : 1) ; 
            const angle = Math.atan2(ann.endY - ann.y, ann.endX - ann.x);
            ctx.lineTo(ann.endX - headLength * Math.cos(angle - Math.PI / 6), ann.endY - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(ann.endX, ann.endY);
            ctx.lineTo(ann.endX - headLength * Math.cos(angle + Math.PI / 6), ann.endY - headLength * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
          }
          break;
        case 'text':
          if (ann.text) {
            ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(ann.text, ann.x, ann.y);
          }
          break;
      }
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
      // No drawing if no image and tool is not text (text can be added on empty canvas)
      if (!image && tool !== 'text' && tool !== null) return; // Allow text tool on empty canvas
      if (!tool) return;

      const point = getMousePosition(e);
      
      if (tool === 'text') {
        const canvasClickPos = getCanvasClickPosition(e);
        onRequestTextInput(point, canvasClickPos);
        return;
      }

      setIsDrawing(true);
      setStartPoint(point);
      setCurrentDrawing({ type: tool, x: point.x, y: point.y, color: newAnnotationColor });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDrawing || !startPoint || !tool ) return; // No !image check needed here, covered by isDrawing
      const point = getMousePosition(e);

      if (tool === 'crop') {
        if (!image) return; // Crop only makes sense with an image
        const x = Math.min(startPoint.x, point.x);
        const y = Math.min(startPoint.y, point.y);
        const width = Math.abs(startPoint.x - point.x);
        const height = Math.abs(startPoint.y - point.y);
        onSetCropPreviewRect({ x, y, width, height });
        return;
      }

      const current: Partial<Annotation> = { ...currentDrawing }; 
      switch (tool) {
        case 'rect':
          current.width = point.x - startPoint.x;
          current.height = point.y - startPoint.y;
          break;
        case 'circle':
          const dx = point.x - startPoint.x;
          const dy = point.y - startPoint.y;
          // Radius is half the distance between start and current point
          // Center is midpoint between start and current point
          current.radius = Math.sqrt(dx * dx + dy * dy) / 2;
          current.x = startPoint.x + dx / 2; 
          current.y = startPoint.y + dy / 2;
          break;
        case 'arrow':
          current.endX = point.x;
          current.endY = point.y;
          break;
      }
      setCurrentDrawing(current);
    };

    const handleMouseUp = () => {
      if (!isDrawing || !startPoint || !tool ) { // No !image check needed here
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentDrawing(null);
        return;
      }
      
      if (tool === 'crop') {
        if (!image) return; // Crop only makes sense with an image
        setIsDrawing(false);
        setStartPoint(null);
        // cropPreviewRect is already set by mouseMove, no new annotation added here
        return;
      }

      let finalAnnotation: Annotation | null = null;
      if (currentDrawing) {
        if (currentDrawing.type === 'rect' && currentDrawing.width !== undefined && currentDrawing.height !== undefined) {
            let x = startPoint.x;
            let y = startPoint.y;
            let w = currentDrawing.width;
            let h = currentDrawing.height;
            // Ensure width and height are positive, adjust x/y accordingly
            if (w < 0) { x = startPoint.x + w; w = -w; }
            if (h < 0) { y = startPoint.y + h; h = -h; }
            if (w > 0 || h > 0) { // Only add if it has some dimension
              finalAnnotation = { ...currentDrawing, id: Date.now().toString(), x, y, width: w, height: h } as Annotation;
            }
        } else if (currentDrawing.type === 'circle' && currentDrawing.radius !== undefined && currentDrawing.radius > 0) {
            // currentDrawing.x and currentDrawing.y are already the center
            finalAnnotation = { ...currentDrawing, id: Date.now().toString(), x: currentDrawing.x!, y: currentDrawing.y!, radius: currentDrawing.radius } as Annotation;
        } else if (currentDrawing.type === 'arrow' && currentDrawing.endX !== undefined && currentDrawing.endY !== undefined) {
            // Only add if start and end points are different (arrow has length)
            if (startPoint.x !== currentDrawing.endX || startPoint.y !== currentDrawing.endY) {
              finalAnnotation = { ...currentDrawing, id: Date.now().toString(), x: startPoint.x, y: startPoint.y, endX: currentDrawing.endX, endY: currentDrawing.endY } as Annotation;
            }
        }
      }

      if (finalAnnotation) {
        onAddAnnotation(finalAnnotation);
      }

      setIsDrawing(false);
      setStartPoint(null);
      setCurrentDrawing(null);
    };
    

    return (
      <canvas
        ref={internalCanvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // End drawing if mouse leaves canvas
        className="w-full h-full cursor-crosshair" // Removed object-contain
        style={{ touchAction: 'none' }} 
      />
    );
  }
);

ScreenshotCanvas.displayName = 'ScreenshotCanvas';
