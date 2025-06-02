
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
  // For circles
  radius?: number;
}

interface ScreenshotCanvasProps {
  image: HTMLImageElement | null;
  tool: Tool | null;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Annotation) => void;
  onRequestTextInput: (point: Point, canvasPosition: Point) => void;
  externalCanvasRef: RefObject<HTMLCanvasElement>; // For main app to access canvas
  cropPreviewRect: CropRect | null;
  onSetCropPreviewRect: (rect: CropRect | null) => void;
}

const LINE_WIDTH = 3;
const ANNOTATION_COLOR = 'hsl(var(--accent))';
const TEXT_COLOR = 'hsl(var(--accent))';
const FONT_SIZE = 16;
const FONT_FAMILY = 'Inter, sans-serif';


export const ScreenshotCanvas = forwardRef<{ performCrop: (rect: CropRect) => Promise<HTMLImageElement | null>, getCanvas: () => HTMLCanvasElement | null }, ScreenshotCanvasProps>(
  ({ image, tool, annotations, onAddAnnotation, onRequestTextInput, externalCanvasRef, cropPreviewRect, onSetCropPreviewRect }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [currentDrawing, setCurrentDrawing] = useState<Partial<Annotation> | null>(null);
    const [canvasSize, setCanvasSize] = useState<{width: number, height: number}>({width: 800, height: 600}); // Default size

    // Merge internal and external refs
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
        
        tempCtx.drawImage(
          image,
          rect.x, rect.y, rect.width, rect.height, // Source rectangle (from original image)
          0, 0, rect.width, rect.height             // Destination rectangle (on temp canvas)
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
      const rect = canvas.getBoundingClientRect();
      // Adjust for canvas scaling if its display size is different from its resolution
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };
    
    const getCanvasClickPosition = (e: React.MouseEvent): Point => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
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

      // Resize canvas to image if image exists, otherwise use default/container size
      if (image) {
        if (canvas.width !== image.width || canvas.height !== image.height) {
           canvas.width = image.width;
           canvas.height = image.height;
           setCanvasSize({width: image.width, height: image.height});
        }
      } else {
        // Placeholder size if no image, or fit to parent
        const parent = canvas.parentElement;
        if (parent) {
            if(canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight){
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                setCanvasSize({width: parent.clientWidth, height: parent.clientHeight});
            }
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (image) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = 'hsl(var(--card))'; // Placeholder background
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
        drawAnnotation(ctx, { ...currentDrawing, x:startPoint.x, y:startPoint.y, id:'temp', color: ANNOTATION_COLOR } as Annotation, true);
      }
      
      if (tool === 'crop' && cropPreviewRect) {
        ctx.strokeStyle = 'rgba(var(--primary-rgb), 0.8)'; // Use primary color with opacity
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(cropPreviewRect.x, cropPreviewRect.y, cropPreviewRect.width, cropPreviewRect.height);
        ctx.setLineDash([]);
      }

    }, [image, annotations, isDrawing, currentDrawing, startPoint, tool, cropPreviewRect, canvasSize]);
    

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
          if (ann.radius !== undefined) {
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
            // Draw arrowhead
            const headLength = 10 * (isPreview ? 0.8 : 1) ; // Arrow head length
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
            ctx.fillStyle = TEXT_COLOR;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(ann.text, ann.x, ann.y);
          }
          break;
      }
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
      if (!image || !tool) return;
      const point = getMousePosition(e);
      
      if (tool === 'text') {
        const canvasClickPos = getCanvasClickPosition(e);
        onRequestTextInput(point, canvasClickPos);
        return;
      }

      setIsDrawing(true);
      setStartPoint(point);
      setCurrentDrawing({ type: tool, x: point.x, y: point.y, color: ANNOTATION_COLOR });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDrawing || !startPoint || !tool || !image) return;
      const point = getMousePosition(e);

      if (tool === 'crop') {
        const x = Math.min(startPoint.x, point.x);
        const y = Math.min(startPoint.y, point.y);
        const width = Math.abs(startPoint.x - point.x);
        const height = Math.abs(startPoint.y - point.y);
        onSetCropPreviewRect({ x, y, width, height });
        return; // cropPreviewRect state change will trigger redraw
      }

      const current: Partial<Annotation> = { ...currentDrawing, color: ANNOTATION_COLOR };
      switch (tool) {
        case 'rect':
          current.width = point.x - startPoint.x;
          current.height = point.y - startPoint.y;
          break;
        case 'circle':
          const dx = point.x - startPoint.x;
          const dy = point.y - startPoint.y;
          current.radius = Math.sqrt(dx * dx + dy * dy) / 2;
          current.x = startPoint.x + dx / 2; // Center of circle
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
      if (!isDrawing || !startPoint || !tool || !image) {
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentDrawing(null);
        return;
      }
      
      if (tool === 'crop') {
        // Crop selection is handled by onSetCropPreviewRect
        setIsDrawing(false);
        setStartPoint(null);
        return;
      }

      let finalAnnotation: Annotation | null = null;
      if (currentDrawing) {
         // Adjust rectangle coordinates for positive width/height
        if (currentDrawing.type === 'rect' && currentDrawing.width !== undefined && currentDrawing.height !== undefined) {
            let x = startPoint.x;
            let y = startPoint.y;
            let w = currentDrawing.width;
            let h = currentDrawing.height;
            if (w < 0) { x = startPoint.x + w; w = -w; }
            if (h < 0) { y = startPoint.y + h; h = -h; }
            finalAnnotation = { ...currentDrawing, id: Date.now().toString(), x, y, width: w, height: h, color: ANNOTATION_COLOR } as Annotation;
        } else if (currentDrawing.type === 'circle' && currentDrawing.radius !== undefined) {
            finalAnnotation = { ...currentDrawing, id: Date.now().toString(), x: currentDrawing.x!, y: currentDrawing.y!, radius: currentDrawing.radius, color: ANNOTATION_COLOR } as Annotation;
        } else if (currentDrawing.type === 'arrow' && currentDrawing.endX !== undefined && currentDrawing.endY !== undefined) {
             finalAnnotation = { ...currentDrawing, id: Date.now().toString(), x: startPoint.x, y: startPoint.y, endX: currentDrawing.endX, endY: currentDrawing.endY, color: ANNOTATION_COLOR } as Annotation;
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
        className="w-full h-full object-contain cursor-crosshair"
        style={{ touchAction: 'none' }} // prevent scrolling on touch devices
      />
    );
  }
);

ScreenshotCanvas.displayName = 'ScreenshotCanvas';
