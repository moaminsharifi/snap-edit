
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { type Tool } from '@/components/snapedit/EditorToolbar';
import { type Annotation, type Point } from '@/components/snapedit/ScreenshotCanvas';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';
import { EditorWorkspace } from './EditorWorkspace';


export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LOCAL_STORAGE_INTRO_KEY = 'snapEditIntroShown_v1';

export const ANNOTATION_COLORS: string[] = [
  'hsl(var(--accent))',
  'hsl(0, 70%, 60%)',
  'hsl(39, 90%, 60%)',
  'hsl(50, 80%, 55%)',
  'hsl(120, 50%, 50%)',
  'hsl(170, 60%, 50%)',
  'hsl(240, 60%, 70%)',
  'hsl(300, 60%, 65%)',
  'hsl(var(--foreground))',
  'hsl(0, 0%, 50%)',
  'hsl(0, 0%, 90%)',
  'hsl(200, 70%, 60%)',
];

export default function SnapEditApp() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationHistory, setAnnotationHistory] = useState<Annotation[][]>([]);
  const [currentAnnotationColor, setCurrentAnnotationColor] = useState<string>(ANNOTATION_COLORS[0]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string; visible: boolean; canvasRelativeX: number, canvasRelativeY: number }>({ x: 0, y: 0, value: '', visible: false, canvasRelativeX: 0, canvasRelativeY: 0 });
  const [cropPreviewRect, setCropPreviewRect] = useState<CropRect | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  
  const preDragAnnotationsRef = useRef<Annotation[] | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenshotCanvasRef = useRef<{ performCrop: (rect: CropRect) => Promise<HTMLImageElement | null>, getCanvas: () => HTMLCanvasElement | null }>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const introShown = localStorage.getItem(LOCAL_STORAGE_INTRO_KEY);
      if (!introShown) {
        setShowInfoDialog(true);
      }
    }
  }, []);

  const handleInfoDialogConfirm = () => {
    setShowInfoDialog(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_INTRO_KEY, 'true');
    }
  };

  const updateHistory = useCallback((newAnnotations: Annotation[]) => {
    setAnnotationHistory(prevHistory => [...prevHistory, annotations]); 
    setAnnotations(newAnnotations);
  }, [annotations]);


  const handleCaptureScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
      const track = stream.getVideoTracks()[0];
      
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
          setSelectedAnnotationId(null);
          toast({ title: "Screenshot Captured!", description: "You can now edit your screenshot." });
        };
        img.src = tempCanvas.toDataURL();
      }
    } catch (err) {
      console.error("Error capturing screenshot: ", err);
      let description = "An unknown error occurred while trying to capture the screenshot.";
      if (err instanceof Error) {
        const lowerCaseMessage = err.message.toLowerCase();
         if (err.name === 'NotAllowedError' || 
            lowerCaseMessage.includes('permission denied') ||
            lowerCaseMessage.includes('disallowed by permissions policy') ||
            lowerCaseMessage.includes('display-capture')) {
          description = "Screen capture permission was denied or is not allowed in your current browser/embedding context. Please check your browser's site permissions for screen sharing. If this app is embedded (e.g., in an iframe), the embedding site needs to allow 'display-capture'.";
        } else {
          description = err.message || "Could not capture screenshot.";
        }
      }
      toast({ title: "Capture Failed", description, variant: "destructive" });
    }
  };

  const handleCopyToClipboard = () => {
    const currentCanvas = screenshotCanvasRef.current?.getCanvas();
    if (currentCanvas) {
      currentCanvas.toBlob(async (blob) => {
        if (blob) {
          try {
            if (!navigator.clipboard || !navigator.clipboard.write) {
              const dataUrl = currentCanvas.toDataURL('image/png');
              // Fallback for browsers/contexts without navigator.clipboard.write (e.g. http, some webviews)
              const success = await new Promise<boolean>(resolve => {
                const textarea = document.createElement('textarea');
                textarea.value = dataUrl; // Not ideal for binary data, but a common fallback
                document.body.appendChild(textarea);
                textarea.select();
                try {
                  document.execCommand('copy');
                  resolve(true);
                } catch (e) {
                  resolve(false);
                } finally {
                  document.body.removeChild(textarea);
                }
              });
              if (success) {
                 toast({ title: "Copied Image Data URL!", description: "Image data URL copied. Paste where supported." });
              } else {
                throw new Error("Clipboard API not available and fallback failed.");
              }
              return; 
            }
            // Modern clipboard API
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
            toast({ title: "Copied to Clipboard!", description: "Image copied successfully." });
          } catch (err) {
            console.error("Error copying to clipboard: ", err);
            let message = "Could not copy image to clipboard.";
            if (err instanceof Error && (err.message.includes("Clipboard API not available") || err.message.includes("document.execCommand('copy') was not successful"))) {
                message = "Clipboard API is not available or failed in this browser/context. Try downloading instead.";
            } else if (err instanceof Error && err.message.toLowerCase().includes("permission denied")) {
                message = "Clipboard permission denied. Please allow clipboard access in your browser settings.";
            }
            toast({ title: "Copy Failed", description: message, variant: "destructive" });
          }
        } else {
          toast({ title: "Copy Failed", description: "Could not generate image for copying.", variant: "destructive" });
        }
      }, 'image/png');
    } else {
      toast({ title: "Nothing to Copy", description: "Please capture or load an image first.", variant: "destructive" });
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
  
  const handleClearAllAnnotations = () => {
    if (image && annotations.length > 0) {
       updateHistory([]);
    } else if (annotations.length === 0 && annotationHistory.length > 0) {
       updateHistory([]); // Clear history if annotations were already empty but history existed
    }
    setCropPreviewRect(null);
    setSelectedTool(null);
    setSelectedAnnotationId(null);
    toast({ title: "Canvas Cleared", description: "All annotations have been removed." });
  };

  const handleUndo = () => {
    if (annotationHistory.length > 0) {
      const previousAnnotations = annotationHistory[annotationHistory.length - 1];
      setAnnotations(previousAnnotations);
      setAnnotationHistory(prevHistory => prevHistory.slice(0, -1));
      setSelectedAnnotationId(null); // Deselect on undo
      toast({ title: "Undo Successful" });
    } else {
      toast({ title: "Nothing to Undo", description: "No previous actions found." });
    }
  };

  const addAnnotation = useCallback((annotation: Annotation) => {
    updateHistory([...annotations, annotation]);
    setSelectedAnnotationId(null); 
  }, [annotations, updateHistory]);

  const handleRequestTextInput = useCallback((point: Point, canvasPosition: {x: number, y: number}) => {
    if (canvasRef.current) { // Check if canvasRef.current is available
      setSelectedAnnotationId(null); 
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setTextInput({
        x: canvasPosition.x + canvasRect.left, // Position relative to viewport
        y: canvasPosition.y + canvasRect.top,  // Position relative to viewport
        canvasRelativeX: point.x, // Position relative to canvas bitmap
        canvasRelativeY: point.y, // Position relative to canvas bitmap
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
        color: currentAnnotationColor, 
      });
    }
    setTextInput({ x: 0, y: 0, value: '', visible: false, canvasRelativeX: 0, canvasRelativeY: 0 });
    setSelectedTool(null); 
  };

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextInputConfirm();
    }
     if (e.key === 'Escape') {
        e.preventDefault();
        setTextInput({ x: 0, y: 0, value: '', visible: false, canvasRelativeX: 0, canvasRelativeY: 0 });
        setSelectedTool(null);
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
          setSelectedAnnotationId(null);
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

  const handleCancelCrop = () => {
    setCropPreviewRect(null);
    setIsCropping(false);
    setSelectedTool(null);
  };

  const handleSelectTool = (tool: Tool | null) => {
    setSelectedTool(tool);
    if (tool !== 'crop') {
        setIsCropping(false);
    }
    if (tool === 'crop') {
        setIsCropping(true);
        setSelectedAnnotationId(null);
    } else if (tool !== 'select') {
        setSelectedAnnotationId(null); 
    }
  };
  
  useEffect(() => {
    if(selectedTool === 'crop') {
      setIsCropping(true);
    }
  }, [selectedTool]);

  const handleSelectAnnotation = useCallback((id: string | null) => {
    if (selectedTool === 'select') {
      setSelectedAnnotationId(id);
    } else if (id !== null) { 
        setSelectedAnnotationId(null); 
    }
  }, [selectedTool]);

  const handleUpdateAnnotation = useCallback((updatedAnnotation: Annotation) => {
    setAnnotations(prevAnnotations => 
      prevAnnotations.map(ann => ann.id === updatedAnnotation.id ? updatedAnnotation : ann)
    );
  }, []);
  
  const handleDragStart = useCallback(() => {
    preDragAnnotationsRef.current = [...annotations]; 
  }, [annotations]);

  const handleEndAnnotationHistoryEntry = useCallback(() => {
    if (preDragAnnotationsRef.current) {
      if (JSON.stringify(preDragAnnotationsRef.current) !== JSON.stringify(annotations)) {
         setAnnotationHistory(prevHistory => [...prevHistory, preDragAnnotationsRef.current!]);
      }
    }
    preDragAnnotationsRef.current = null;
  }, [annotations, setAnnotationHistory]);


  const handleDeleteSelectedAnnotation = useCallback(() => {
    if (selectedAnnotationId) {
      const newAnnotations = annotations.filter(ann => ann.id !== selectedAnnotationId);
      updateHistory(newAnnotations);
      setSelectedAnnotationId(null);
      toast({ title: "Annotation Deleted" });
    }
  }, [selectedAnnotationId, annotations, updateHistory]);


  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                setImage(img);
                setAnnotations([]);
                setAnnotationHistory([]);
                setSelectedAnnotationId(null);
                setSelectedTool(null);
                toast({ title: "Image Loaded", description: "You can now edit the loaded image." });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(files[0]);
    } else {
        toast({ title: "Invalid File", description: "Please drop an image file.", variant: "destructive" });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      {showInfoDialog && (
        <AlertDialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Welcome to SnapEdit!</AlertDialogTitle>
              <AlertDialogDescription>
                SnapEdit helps you capture and annotate screenshots with ease. 
                To use the screen capture feature, your browser will ask for permission when you click the "Capture Screenshot" button.
                <br /><br />
                <strong>Your privacy is important:</strong> All image processing and annotation happen directly on your device. No images are uploaded to any server.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleInfoDialogConfirm}>Got it!</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AppHeader onCaptureScreenshot={handleCaptureScreenshot} />

      <EditorWorkspace
        image={image}
        selectedTool={selectedTool}
        annotations={annotations}
        currentAnnotationColor={currentAnnotationColor}
        selectedAnnotationId={selectedAnnotationId}
        isCropping={isCropping}
        cropPreviewRect={cropPreviewRect}
        canvasRef={canvasRef}
        screenshotCanvasRef={screenshotCanvasRef}
        textInput={textInput}
        onSelectTool={handleSelectTool}
        onDownload={handleDownload}
        onClearAllAnnotations={handleClearAllAnnotations}
        onUndo={handleUndo}
        onCopyToClipboard={handleCopyToClipboard}
        onConfirmCrop={handleConfirmCrop}
        onCancelCrop={handleCancelCrop}
        onSelectColor={setCurrentAnnotationColor}
        onDeleteSelectedAnnotation={handleDeleteSelectedAnnotation}
        onAddAnnotation={addAnnotation}
        onRequestTextInput={handleRequestTextInput}
        onSetCropPreviewRect={setCropPreviewRect}
        onSelectAnnotation={handleSelectAnnotation}
        onUpdateAnnotation={handleUpdateAnnotation}
        onDragStart={handleDragStart}
        onEndAnnotationHistoryEntry={handleEndAnnotationHistoryEntry}
        handleFileDrop={handleFileDrop}
        handleDragOver={handleDragOver}
        availableColors={ANNOTATION_COLORS}
        setTextInput={setTextInput}
        handleTextInputConfirm={handleTextInputConfirm}
        handleTextInputKeyDown={handleTextInputKeyDown}
      />
      
      <AppFooter />
    </div>
  );
}
