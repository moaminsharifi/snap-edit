
"use client";

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, RefObject } from 'react';
import type { Tool } from './EditorToolbar';
import type { CropRect } from './SnapEditApp';
import { cn } from '@/lib/utils';

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
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  onDragStart: () => void; // Callback for when a drag operation starts
  onEndAnnotationHistoryEntry: () => void; 
}

const LINE_WIDTH = 3;
const FONT_SIZE = 16;
const FONT_FAMILY = 'Inter, sans-serif';
const SELECTION_PADDING = 5; 

export const ScreenshotCanvas = forwardRef<{ performCrop: (rect: CropRect) => Promise<HTMLImageElement | null>, getCanvas: () => HTMLCanvasElement | null }, ScreenshotCanvasProps>(
  ({ image, tool, annotations, onAddAnnotation, onRequestTextInput, externalCanvasRef, cropPreviewRect, onSetCropPreviewRect, newAnnotationColor, selectedAnnotationId, onSelectAnnotation, onUpdateAnnotation, onDragStart, onEndAnnotationHistoryEntry }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false); 
    const [isDragging, setIsDragging] = useState(false); 
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [currentDrawing, setCurrentDrawing] = useState<Partial<Annotation> | null>(null); 
    const [draggedAnnotationStartPos, setDraggedAnnotationStartPos] = useState<Point | null>(null); 
    const [canvasSize, setCanvasSize] = useState<{width: number, height: number}>({width: 800, height: 600});
    const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);


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

      const rect = canvas.getBoundingClientRect();
      const bitmapWidth = canvas.width;
      const bitmapHeight = canvas.height;
      
      let scale = 1;
      let offsetX = 0;
      let offsetY = 0;

      if (image) { 
        const canvasAspect = rect.width / rect.height;
        const imageAspect = bitmapWidth / bitmapHeight; 

        if (canvasAspect > imageAspect) { 
            scale = rect.height / bitmapHeight;
            offsetX = (rect.width - bitmapWidth * scale) / 2;
        } else { 
            scale = rect.width / bitmapWidth;
            offsetY = (rect.height - bitmapHeight * scale) / 2;
        }
      } else { 
         scale = Math.min(rect.width / bitmapWidth, rect.height / bitmapHeight);
         offsetX = (rect.width - bitmapWidth * scale) / 2;
         offsetY = (rect.height - bitmapHeight * scale) / 2;
      }
      
      const clientX = 'touches' in e ? (e.nativeEvent as TouchEvent).touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? (e.nativeEvent as TouchEvent).touches[0].clientY : e.clientY;

      const mouseXInElement = clientX - rect.left;
      const mouseYInElement = clientY - rect.top;

      const finalX = (mouseXInElement - offsetX) / scale;
      const finalY = (mouseYInElement - offsetY) / scale;

      return {
        x: Math.max(0, Math.min(finalX, bitmapWidth)),
        y: Math.max(0, Math.min(finalY, bitmapHeight)),
      };
    };

    const getCanvasClickPosition = (e: React.MouseEvent): Point => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? (e.nativeEvent as TouchEvent).touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? (e.nativeEvent as TouchEvent).touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const getAnnotationAtPoint = (point: Point, ctx: CanvasRenderingContext2D): Annotation | null => {
      for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i];
        switch (ann.type) {
          case 'rect':
            if (ann.width !== undefined && ann.height !== undefined) {
              const x1 = Math.min(ann.x, ann.x + ann.width);
              const x2 = Math.max(ann.x, ann.x + ann.width);
              const y1 = Math.min(ann.y, ann.y + ann.height);
              const y2 = Math.max(ann.y, ann.y + ann.height);
              if (point.x >= x1 - SELECTION_PADDING && point.x <= x2 + SELECTION_PADDING && 
                  point.y >= y1 - SELECTION_PADDING && point.y <= y2 + SELECTION_PADDING) return ann;
            }
            break;
          case 'circle':
            if (ann.radius !== undefined) {
              const dx = point.x - ann.x;
              const dy = point.y - ann.y;
              if (Math.sqrt(dx * dx + dy * dy) <= ann.radius + SELECTION_PADDING) return ann;
            }
            break;
          case 'arrow':
            if (ann.endX !== undefined && ann.endY !== undefined) {
              const minX = Math.min(ann.x, ann.endX) - SELECTION_PADDING;
              const maxX = Math.max(ann.x, ann.endX) + SELECTION_PADDING;
              const minY = Math.min(ann.y, ann.endY) - SELECTION_PADDING;
              const maxY = Math.max(ann.y, ann.endY) + SELECTION_PADDING;
              if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) continue;

              const l2 = (ann.endX - ann.x) ** 2 + (ann.endY - ann.y) ** 2;
              if (l2 === 0) { 
                 if (Math.sqrt((point.x - ann.x)**2 + (point.y - ann.y)**2) < SELECTION_PADDING + LINE_WIDTH) return ann;
                 continue;
              }
              let t = ((point.x - ann.x) * (ann.endX - ann.x) + (point.y - ann.y) * (ann.endY - ann.y)) / l2;
              t = Math.max(0, Math.min(1, t));
              const closestX = ann.x + t * (ann.endX - ann.x);
              const closestY = ann.y + t * (ann.endY - ann.y);
              const dist = Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
              if (dist <= LINE_WIDTH / 2 + SELECTION_PADDING) return ann;
            }
            break;
          case 'text':
            if (ann.text) {
              ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
              const textMetrics = ctx.measureText(ann.text);
              const textHeight = FONT_SIZE * 1.2; 
              if (point.x >= ann.x - SELECTION_PADDING && point.x <= ann.x + textMetrics.width + SELECTION_PADDING &&
                  point.y >= ann.y - SELECTION_PADDING && point.y <= ann.y + textHeight + SELECTION_PADDING) return ann;
            }
            break;
        }
      }
      return null;
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
            const displayWidth = Math.max(300, parent.clientWidth); 
            const displayHeight = Math.max(200, parent.clientHeight);
            if(canvas.width !== displayWidth || canvas.height !== displayHeight){
                canvas.width = displayWidth;
                canvas.height = displayHeight;
                setCanvasSize({width: displayWidth, height: displayHeight});
            }
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (image) {
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

      annotations.forEach(ann => drawAnnotation(ctx, ann, ann.id === selectedAnnotationId));
      
      if (isDrawing && currentDrawing && startPoint && currentDrawing.type !== 'select' && currentDrawing.type !== 'crop') {
        drawAnnotation(ctx, { ...currentDrawing, x:startPoint.x, y:startPoint.y, id:'temp', color: newAnnotationColor } as Annotation, false, true);
      }

      if (tool === 'crop' && cropPreviewRect) {
        ctx.strokeStyle = 'hsla(var(--primary-hsl), 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(cropPreviewRect.x, cropPreviewRect.y, cropPreviewRect.width, cropPreviewRect.height);
        ctx.setLineDash([]);
      }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [image, annotations, isDrawing, currentDrawing, startPoint, tool, cropPreviewRect, canvasSize, newAnnotationColor, selectedAnnotationId, isDragging]);


    const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation, isSelected = false, isPreview = false) => {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = LINE_WIDTH;

      switch (ann.type) {
        case 'rect':
          if (ann.width !== undefined && ann.height !== undefined) {
            ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
             if (isSelected && !isPreview) {
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = 'hsl(var(--ring))'; 
              ctx.lineWidth = 1;
              ctx.strokeRect(ann.x - SELECTION_PADDING, ann.y - SELECTION_PADDING, ann.width + SELECTION_PADDING*2, ann.height + SELECTION_PADDING*2);
              ctx.setLineDash([]);
            }
          }
          break;
        case 'circle':
          if (ann.radius !== undefined && ann.radius > 0) {
            ctx.beginPath();
            ctx.arc(ann.x, ann.y, ann.radius, 0, 2 * Math.PI);
            ctx.stroke();
             if (isSelected && !isPreview) {
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = 'hsl(var(--ring))';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(ann.x, ann.y, ann.radius + SELECTION_PADDING, 0, 2 * Math.PI);
              ctx.stroke();
              ctx.setLineDash([]);
            }
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
            if (isSelected && !isPreview) {
              ctx.setLineDash([4, 4]);
              ctx.strokeStyle = 'hsl(var(--ring))';
              ctx.lineWidth = 1;
              const minX = Math.min(ann.x, ann.endX) - SELECTION_PADDING;
              const minY = Math.min(ann.y, ann.endY) - SELECTION_PADDING;
              const maxX = Math.max(ann.x, ann.endX) + SELECTION_PADDING;
              const maxY = Math.max(ann.y, ann.endY) + SELECTION_PADDING;
              ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
              ctx.setLineDash([]);
            }
          }
          break;
        case 'text':
          if (ann.text) {
            ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(ann.text, ann.x, ann.y);
             if (isSelected && !isPreview) {
              const textMetrics = ctx.measureText(ann.text);
              const textHeight = FONT_SIZE * 1.2; 
              ctx.setLineDash([3, 3]);
              ctx.strokeStyle = 'hsl(var(--ring))';
              ctx.lineWidth = 1;
              ctx.strokeRect(ann.x - SELECTION_PADDING/2, ann.y - SELECTION_PADDING/2, textMetrics.width + SELECTION_PADDING, textHeight + SELECTION_PADDING);
              ctx.setLineDash([]);
            }
          }
          break;
      }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault(); 
      if (!tool) return;
      if (!image && tool !== 'text' && tool !== 'select' && tool !== null) return;


      const point = getMousePosition(e);
      const canvas = internalCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (tool === 'select') {
        const clickedAnnotation = getAnnotationAtPoint(point, ctx);
        if (clickedAnnotation) {
          onSelectAnnotation(clickedAnnotation.id);
          setIsDragging(true);
          setStartPoint(point); 
          setDraggedAnnotationStartPos({ x: clickedAnnotation.x, y: clickedAnnotation.y }); 
          onDragStart(); // Notify app that drag has started for history purposes
        } else {
          onSelectAnnotation(null);
        }
        return;
      }
      
      onSelectAnnotation(null); 
      setIsDrawing(true);
      setStartPoint(point);

      if (tool === 'text') {
        const canvasClickPos = getCanvasClickPosition(e);
        onRequestTextInput(point, canvasClickPos);
        setIsDrawing(false); 
        return;
      }
      
      if (tool !== 'crop' && tool !== 'select') {
        setCurrentDrawing({ type: tool, x: point.x, y: point.y, color: newAnnotationColor });
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!tool) return;
      const point = getMousePosition(e);

      if (tool === 'select') {
        const canvas = internalCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (isDragging && selectedAnnotationId && startPoint && draggedAnnotationStartPos) {
          const originalAnnotation = annotations.find(ann => ann.id === selectedAnnotationId);
          if (!originalAnnotation) return;

          const dx = point.x - startPoint.x;
          const dy = point.y - startPoint.y;

          let updatedAnn: Annotation = { ...originalAnnotation };
          updatedAnn.x = draggedAnnotationStartPos.x + dx;
          updatedAnn.y = draggedAnnotationStartPos.y + dy;

          if (originalAnnotation.type === 'arrow' && originalAnnotation.endX !== undefined && originalAnnotation.endY !== undefined) {
              const originalEndX = (originalAnnotation.endX - originalAnnotation.x) + draggedAnnotationStartPos.x;
              const originalEndY = (originalAnnotation.endY - originalAnnotation.y) + draggedAnnotationStartPos.y;
              updatedAnn.endX = originalEndX + dx;
              updatedAnn.endY = originalEndY + dy;
          }
          onUpdateAnnotation(updatedAnn);

        } else { 
           const ann = getAnnotationAtPoint(point, ctx);
           setHoveredAnnotationId(ann ? ann.id : null);
        }
        return;
      }
      
      if (!isDrawing || !startPoint ) return;

      if (tool === 'crop') {
        if (!image) return;
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

    const handleMouseUp = (e: React.MouseEvent) => {
      e.preventDefault();
      if (tool === 'select') {
        if (isDragging) {
            onEndAnnotationHistoryEntry(); 
        }
        setIsDragging(false);
        setStartPoint(null);
        setDraggedAnnotationStartPos(null);
        return;
      }

      if (!isDrawing || !startPoint || !tool ) {
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentDrawing(null);
        return;
      }

      if (tool === 'crop') {
        if (!image) return;
        setIsDrawing(false);
        setStartPoint(null);
        return;
      }

      let finalAnnotation: Annotation | null = null;
      if (currentDrawing && currentDrawing.type && tool !== 'select' && tool !== 'crop') {
         const type = tool; 
        if (type === 'rect' && currentDrawing.width !== undefined && currentDrawing.height !== undefined) {
            let x = startPoint.x;
            let y = startPoint.y;
            let w = currentDrawing.width;
            let h = currentDrawing.height;
            if (w < 0) { x = startPoint.x + w; w = -w; }
            if (h < 0) { y = startPoint.y + h; h = -h; }
            if (w > LINE_WIDTH || h > LINE_WIDTH) { 
              finalAnnotation = { ...currentDrawing, type, id: Date.now().toString(), x, y, width: w, height: h, color: newAnnotationColor } as Annotation;
            }
        } else if (type === 'circle' && currentDrawing.radius !== undefined && currentDrawing.radius > LINE_WIDTH / 2) { 
            finalAnnotation = { ...currentDrawing, type, id: Date.now().toString(), x: currentDrawing.x!, y: currentDrawing.y!, radius: currentDrawing.radius, color: newAnnotationColor } as Annotation;
        } else if (type === 'arrow' && currentDrawing.endX !== undefined && currentDrawing.endY !== undefined) {
            if (Math.abs(startPoint.x - currentDrawing.endX) > LINE_WIDTH || Math.abs(startPoint.y - currentDrawing.endY) > LINE_WIDTH) { 
              finalAnnotation = { ...currentDrawing, type, id: Date.now().toString(), x: startPoint.x, y: startPoint.y, endX: currentDrawing.endX, endY: currentDrawing.endY, color: newAnnotationColor } as Annotation;
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
    
    let canvasCursorClass = 'cursor-default';
    if (tool) {
      if (tool === 'select') {
        if (isDragging) {
          canvasCursorClass = 'fine:cursor-grabbing coarse:cursor-grabbing';
        } else if (hoveredAnnotationId) {
          canvasCursorClass = 'fine:cursor-grab coarse:cursor-pointer';
        } else {
          canvasCursorClass = 'fine:cursor-default coarse:cursor-default';
        }
      } else if (tool === 'text') {
        canvasCursorClass = 'fine:cursor-text coarse:cursor-pointer';
      } else if (tool === 'crop') {
         canvasCursorClass = 'fine:cursor-crosshair coarse:cursor-pointer';
      }
       else { 
        canvasCursorClass = 'fine:cursor-crosshair coarse:cursor-pointer';
      }
    }


    return (
      <canvas
        ref={internalCanvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={(e) => {
          if (isDrawing || isDragging) handleMouseUp(e); 
          setHoveredAnnotationId(null);
        }}
        onTouchStart={handleMouseDown as any} 
        onTouchMove={handleMouseMove as any}
        onTouchEnd={handleMouseUp as any}
        className={cn('w-full h-full', canvasCursorClass)}
        style={{ touchAction: 'none' }} 
      />
    );
  }
);

ScreenshotCanvas.displayName = 'ScreenshotCanvas';


    