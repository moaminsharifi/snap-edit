
"use client";

import React from 'react';
import { EditorToolbar, type Tool } from '@/components/snapedit/EditorToolbar';
import { ScreenshotCanvas, type Annotation, type Point } from '@/components/snapedit/ScreenshotCanvas';
import { Textarea } from '@/components/ui/textarea';
import { ImagePlus } from 'lucide-react';
import type { CropRect } from './SnapEditApp';

interface EditorWorkspaceProps {
  image: HTMLImageElement | null;
  selectedTool: Tool | null;
  annotations: Annotation[];
  currentAnnotationColor: string;
  selectedAnnotationId: string | null;
  isCropping: boolean;
  cropPreviewRect: CropRect | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  screenshotCanvasRef: React.RefObject<{ performCrop: (rect: CropRect) => Promise<HTMLImageElement | null>, getCanvas: () => HTMLCanvasElement | null }>;
  textInput: { x: number; y: number; value: string; visible: boolean; canvasRelativeX: number, canvasRelativeY: number };
  
  onSelectTool: (tool: Tool | null) => void;
  onDownload: () => void;
  onClearAllAnnotations: () => void;
  onUndo: () => void;
  onCopyToClipboard: () => void;
  onConfirmCrop: () => void;
  onCancelCrop: () => void;
  onSelectColor: (color: string) => void;
  onDeleteSelectedAnnotation: () => void;
  onAddAnnotation: (annotation: Annotation) => void;
  onRequestTextInput: (point: Point, canvasPosition: Point) => void;
  onSetCropPreviewRect: (rect: CropRect | null) => void;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  onDragStart: () => void;
  onEndAnnotationHistoryEntry: () => void;
  handleFileDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  availableColors: string[];
  setTextInput: React.Dispatch<React.SetStateAction<{ x: number; y: number; value: string; visible: boolean; canvasRelativeX: number, canvasRelativeY: number }>>;
  handleTextInputConfirm: () => void;
  handleTextInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function EditorWorkspace({
  image,
  selectedTool,
  annotations,
  currentAnnotationColor,
  selectedAnnotationId,
  isCropping,
  cropPreviewRect,
  canvasRef,
  screenshotCanvasRef,
  textInput,
  onSelectTool,
  onDownload,
  onClearAllAnnotations,
  onUndo,
  onCopyToClipboard,
  onConfirmCrop,
  onCancelCrop,
  onSelectColor,
  onDeleteSelectedAnnotation,
  onAddAnnotation,
  onRequestTextInput,
  onSetCropPreviewRect,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDragStart,
  onEndAnnotationHistoryEntry,
  handleFileDrop,
  handleDragOver,
  availableColors,
  setTextInput,
  handleTextInputConfirm,
  handleTextInputKeyDown,
}: EditorWorkspaceProps) {
  return (
    <main className="flex-grow container mx-auto p-4 md:p-6 space-y-4 flex flex-col items-center">
      {image && (
        <EditorToolbar
          selectedTool={selectedTool}
          onSelectTool={onSelectTool}
          onDownload={onDownload}
          onClearAll={onClearAllAnnotations}
          onUndo={onUndo}
          onCopyToClipboard={onCopyToClipboard}
          isCropping={isCropping}
          hasCropSelection={!!cropPreviewRect}
          onConfirmCrop={onConfirmCrop}
          onCancelCrop={onCancelCrop}
          selectedColor={currentAnnotationColor}
          onSelectColor={onSelectColor}
          availableColors={availableColors}
          selectedAnnotationId={selectedAnnotationId}
          onDeleteSelected={onDeleteSelectedAnnotation}
        />
      )}

      <div
        className={`w-full max-w-5xl aspect-[16/9] bg-card rounded-lg shadow-xl overflow-hidden border border-border ${image ? '' : 'flex items-center justify-center'}`}
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        {image ? (
          <ScreenshotCanvas
            ref={screenshotCanvasRef}
            externalCanvasRef={canvasRef}
            image={image}
            tool={selectedTool}
            annotations={annotations}
            onAddAnnotation={onAddAnnotation}
            onRequestTextInput={onRequestTextInput}
            cropPreviewRect={cropPreviewRect}
            onSetCropPreviewRect={onSetCropPreviewRect}
            newAnnotationColor={currentAnnotationColor}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={onSelectAnnotation}
            onUpdateAnnotation={onUpdateAnnotation}
            onDragStart={onDragStart}
            onEndAnnotationHistoryEntry={onEndAnnotationHistoryEntry}
          />
        ) : (
          <div className="text-center p-10 pointer-events-none">
            <ImagePlus strokeWidth={1} className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Image Captured</h2>
            <p className="text-muted-foreground">Click "Capture Screenshot" above, or drag and drop an image here.</p>
          </div>
        )}
      </div>
        
      {textInput.visible && (
        <Textarea
          value={textInput.value}
          onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
          onKeyDown={handleTextInputKeyDown}
          onBlur={() => { 
              if (textInput.value.trim() !== '') {
                  handleTextInputConfirm();
              } else {
                  setTextInput({ x: 0, y: 0, value: '', visible: false, canvasRelativeX: 0, canvasRelativeY: 0 });
                  if (selectedTool === 'text') onSelectTool(null); // Deselect text tool if input is cancelled
              }
          }}
          autoFocus
          className="fixed z-50 p-2 border rounded shadow-lg bg-card w-auto max-w-[calc(100vw-2rem)] sm:w-48 min-h-[40px] resize-none overflow-hidden"
          style={{ left: `${textInput.x}px`, top: `${textInput.y}px`, color: currentAnnotationColor }}
          placeholder="Type text..."
        />
      )}
    </main>
  );
}
