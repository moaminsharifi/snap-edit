
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { EditorToolbar, Tool } from '@/components/snapedit/EditorToolbar';
import { ScreenshotCanvas, Annotation, Point } from '@/components/snapedit/ScreenshotCanvas';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver'; // Added for robust download

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function SnapEditApp() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationHistory, setAnnotationHistory] = useState<Annotation[][]>([]);
  
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string; visible: boolean; canvasRelativeX: number, canvasRelativeY: number }>({ x: 0, y: 0, value: '', visible: false, canvasRelativeX: 0, canvasRelativeY: 0 });
  const [cropPreviewRect, setCropPreviewRect] = useState<CropRect | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenshotCanvasRef = useRef<{ performCrop: (rect: CropRect) => Promise<HTMLImageElement | null>, getCanvas: () => HTMLCanvasElement | null }>(null);
  const { toast } = useToast();

  const updateHistory = useCallback((newAnnotations: Annotation[]) => {
    setAnnotationHistory(prevHistory => [...prevHistory, annotations]);
    setAnnotations(newAnnotations);
  }, [annotations]);

  const handleCaptureScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
      const track = stream.getVideoTracks()[0];
      
      // Delay needed for some browsers to actually start capture
      await new Promise(resolve => setTimeout(resolve, 300));

      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = bitmap.width;
      tempCanvas.height = bitmap.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(bitmap, 0, 0);
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setAnnotations([]);
          setAnnotationHistory([]);
          setCropPreviewRect(null);
          setSelectedTool(null);
          toast({ title: "Screenshot Captured!", description: "You can now edit your screenshot." });
        };
        img.src = tempCanvas.toDataURL();
      }
    } catch (err) {
      console.error("Error capturing screenshot: ", err);
      toast({ title: "Capture Failed", description: (err as Error).message || "Could not capture screenshot.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    const currentCanvas = screenshotCanvasRef.current?.getCanvas();
    if (currentCanvas) {
      currentCanvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, 'snapedit-screenshot.png');
          toast({ title: "Download Started", description: "Your image is being downloaded." });
        } else {
          toast({ title: "Download Failed", description: "Could not generate image for download.", variant: "destructive" });
        }
      }, 'image/png');
    } else {
      toast({ title: "Nothing to Download", description: "Please capture or load an image first.", variant: "destructive" });
    }
  };
  
  const handleClearCanvas = () => {
    if (image) {
       updateHistory([]); // Clear annotations and update history
    }
    setCropPreviewRect(null);
    setSelectedTool(null);
    toast({ title: "Canvas Cleared", description: "All annotations have been removed." });
  };

  const handleUndo = () => {
    if (annotationHistory.length > 0) {
      const previousAnnotations = annotationHistory[annotationHistory.length - 1];
      setAnnotations(previousAnnotations);
      setAnnotationHistory(prevHistory => prevHistory.slice(0, -1));
      toast({ title: "Undo Successful" });
    } else {
      toast({ title: "Nothing to Undo", description: "No previous actions found." });
    }
  };

  const addAnnotation = useCallback((annotation: Annotation) => {
    updateHistory([...annotations, annotation]);
  }, [annotations, updateHistory]);

  const handleRequestTextInput = useCallback((point: Point, canvasPosition: {x: number, y: number}) => {
    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setTextInput({
        x: canvasPosition.x + canvasRect.left, // Absolute position on page
        y: canvasPosition.y + canvasRect.top,  // Absolute position on page
        canvasRelativeX: point.x, // Position relative to canvas content
        canvasRelativeY: point.y, // Position relative to canvas content
        value: '',
        visible: true
      });
    }
  }, []);

  const handleTextInputConfirm = () => {
    if (textInput.value.trim() !== '') {
      addAnnotation({
        id: Date.now().toString(),
        type: 'text',
        x: textInput.canvasRelativeX,
        y: textInput.canvasRelativeY,
        text: textInput.value,
        color: 'hsl(var(--accent))', // Use accent color
      });
    }
    setTextInput({ x: 0, y: 0, value: '', visible: false, canvasRelativeX: 0, canvasRelativeY: 0 });
  };

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextInputConfirm();
    }
  };

  const handleConfirmCrop = async () => {
    if (cropPreviewRect && screenshotCanvasRef.current) {
      try {
        const croppedImage = await screenshotCanvasRef.current.performCrop(cropPreviewRect);
        if (croppedImage) {
          setImage(croppedImage);
          setAnnotations([]);
          setAnnotationHistory([]);
          setCropPreviewRect(null);
          setSelectedTool(null);
          setIsCropping(false);
          toast({ title: "Crop Successful", description: "Image has been cropped." });
        } else {
          throw new Error("Cropping returned null image");
        }
      } catch (error) {
         console.error("Error cropping image:", error);
         toast({ title: "Crop Failed", description: "Could not crop the image.", variant: "destructive" });
      }
    }
  };
  
  useEffect(() => {
    if(selectedTool === 'crop') {
      setIsCropping(true);
    } else if (isCropping && selectedTool !== 'crop') {
      // If tool changed from crop and crop wasn't confirmed, cancel crop
      setIsCropping(false);
      setCropPreviewRect(null);
    }
  }, [selectedTool, isCropping]);


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <header className="p-4 border-b shadow-sm bg-card sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-headline font-semibold text-primary">SnapEdit</h1>
          <Button onClick={handleCaptureScreenshot} variant="default" size="lg">
            Capture Screenshot
          </Button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center p-4 md:p-6 space-y-4">
        {image && (
          <EditorToolbar
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
            onDownload={handleDownload}
            onClear={handleClearCanvas}
            onUndo={handleUndo}
            isCropping={isCropping}
            hasCropSelection={!!cropPreviewRect}
            onConfirmCrop={handleConfirmCrop}
            onCancelCrop={() => {
              setCropPreviewRect(null);
              setIsCropping(false);
              setSelectedTool(null);
            }}
          />
        )}

        <div className={`w-full max-w-5xl aspect-[16/9] bg-card rounded-lg shadow-xl overflow-hidden border border-border ${image ? '' : 'flex items-center justify-center'}`}>
          {image ? (
            <ScreenshotCanvas
              ref={screenshotCanvasRef}
              externalCanvasRef={canvasRef}
              image={image}
              tool={selectedTool}
              annotations={annotations}
              onAddAnnotation={addAnnotation}
              onRequestTextInput={handleRequestTextInput}
              cropPreviewRect={cropPreviewRect}
              onSetCropPreviewRect={setCropPreviewRect}
            />
          ) : (
            <div className="text-center p-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image-plus mx-auto mb-4 text-muted-foreground"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <h2 className="text-xl font-semibold text-foreground mb-2">No Image Captured</h2>
              <p className="text-muted-foreground">Click "Capture Screenshot" above to get started.</p>
            </div>
          )}
        </div>
        
        {textInput.visible && (
          <Textarea
            value={textInput.value}
            onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
            onKeyDown={handleTextInputKeyDown}
            onBlur={handleTextInputConfirm}
            autoFocus
            className="fixed z-50 p-2 border rounded shadow-lg bg-card w-48 min-h-[40px] resize-none overflow-hidden"
            style={{ left: `${textInput.x}px`, top: `${textInput.y}px` }}
            placeholder="Type text..."
          />
        )}
      </main>
      <footer className="text-center p-4 border-t text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SnapEdit. All rights reserved.</p>
      </footer>
    </div>
  );
}
