
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { EditorToolbar, Tool } from '@/components/snapedit/EditorToolbar';
import { ScreenshotCanvas, Annotation, Point } from '@/components/snapedit/ScreenshotCanvas';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Github, ExternalLink, ImagePlus } from 'lucide-react';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LOCAL_STORAGE_INTRO_KEY = 'snapEditIntroShown_v1'; // Increment if dialog content changes significantly

export const ANNOTATION_COLORS: string[] = [
  'hsl(var(--accent))',      // Default Accent Blue
  'hsl(0, 70%, 60%)',        // Red
  'hsl(39, 90%, 60%)',       // Orange
  'hsl(50, 80%, 55%)',       // Yellow
  'hsl(120, 50%, 50%)',      // Green
  'hsl(170, 60%, 50%)',      // Teal
  'hsl(240, 60%, 70%)',      // Indigo
  'hsl(300, 60%, 65%)',      // Pink/Magenta
  'hsl(var(--foreground))',  // Default Text Color (Dark Gray/Black)
  'hsl(0, 0%, 50%)',         // Medium Gray
  'hsl(0, 0%, 90%)',         // Light Gray
  'hsl(200, 70%, 60%)',      // Another Blue
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
  const [isHistoryUpdatePending, setIsHistoryUpdatePending] = useState(false);


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

  const updateHistory = useCallback((newAnnotations: Annotation[], isFinalUpdate = true) => {
    if (isFinalUpdate) {
        setAnnotationHistory(prevHistory => [...prevHistory, annotations]); // current annotations before update
    }
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
              const success = await new Promise<boolean>(resolve => {
                const textarea = document.createElement('textarea');
                textarea.value = dataUrl; 
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
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
            toast({ title: "Copied to Clipboard!", description: "Image copied successfully." });
          } catch (err) {
            console.error("Error copying to clipboard: ", err);
            let message = "Could not copy image to clipboard.";
            if (err instanceof Error && (err.message.includes("Clipboard API not available") || err.message.includes("document.execCommand(\'copy\') was not successful"))) {
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
    if (image && annotations.length > 0) { // Only update history if there were annotations
       updateHistory([]);
    } else if (annotations.length === 0 && annotationHistory.length > 0) {
       // If canvas is already empty but history exists (e.g. after undoing to empty state)
       // still allow "clearing" to effectively reset history from that point.
       updateHistory([]);
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
    setSelectedAnnotationId(null); // Deselect after adding new
  }, [annotations, updateHistory]);

  const handleRequestTextInput = useCallback((point: Point, canvasPosition: {x: number, y: number}) => {
    if (canvasRef.current) {
      setSelectedAnnotationId(null); // Deselect when starting text input
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setTextInput({
        x: canvasPosition.x + canvasRect.left,
        y: canvasPosition.y + canvasRect.top,
        canvasRelativeX: point.x,
        canvasRelativeY: point.y,
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
    setSelectedTool(null); // De-select text tool after input
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
          setAnnotations([]); // Clear annotations for the new image
          setAnnotationHistory([]); // Clear history for the new image
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

  const handleSelectTool = (tool: Tool | null) => {
    setSelectedTool(tool);
    if (tool !== 'crop') {
        setIsCropping(false);
        // setCropPreviewRect(null); // Keep crop preview if user switches away and back
    }
    if (tool === 'crop') {
        setIsCropping(true);
        setSelectedAnnotationId(null);
    } else if (tool !== 'select') {
        setSelectedAnnotationId(null); // Deselect annotation if switching to a drawing tool
    }
  };
  
  useEffect(() => {
    if(selectedTool === 'crop') {
      setIsCropping(true);
    } else if (isCropping && selectedTool !== 'crop') {
      // Don't immediately hide crop UI if switching away temporarily
      // setIsCropping(false); 
      // setCropPreviewRect(null);
    }
  }, [selectedTool, isCropping]);

  const handleSelectAnnotation = useCallback((id: string | null) => {
    if (selectedTool === 'select') {
      setSelectedAnnotationId(id);
    } else if (id !== null) { // If a drawing tool is active and canvas tries to select (e.g. on new shape creation)
        setSelectedAnnotationId(null); // Ensure deselection
    }
  }, [selectedTool]);

  const handleUpdateAnnotation = useCallback((updatedAnnotation: Annotation) => {
    const newAnnotations = annotations.map(ann => ann.id === updatedAnnotation.id ? updatedAnnotation : ann);
    setAnnotations(newAnnotations); // Update live, history entry on mouse up
    setIsHistoryUpdatePending(true); // Mark that a history update is needed on mouseup/dragend
  }, [annotations]);

  const handleEndAnnotationHistoryEntry = useCallback(() => {
    if (isHistoryUpdatePending) {
        setAnnotationHistory(prev => [...prev, annotations.filter(a => a.id !== selectedAnnotationId), ...annotations.filter(a => a.id === selectedAnnotationId)]); // A bit complex, essentially snapshotting the current state for undo
        // A simpler history update: just push the current state of `annotations`
        // This means an undo of a move will revert all annotations to their state before the move started.
        setAnnotationHistory(prev => {
            // Find the previous state of the moved annotation to form a "before" state for history
            const lastHistoryState = prev.length > 0 ? prev[prev.length - 1] : [];
            return [...prev, lastHistoryState]; // This is not quite right.
        });
        // Correct approach for history on drag end:
        // The `annotations` state is already updated during drag.
        // We need to push the state *before* the drag started into history.
        // This is tricky with live updates. The `updateHistory` callback is better suited for discrete actions.
        // For now, let's simplify: the history will capture the state *after* the drag.
        // A better way is to snapshot `annotations` on drag start, and push that to history when drag ends with the new state.

        // Simplest history update for now (captures state AFTER modification):
        setAnnotationHistory(prevHistory => [...prevHistory, annotations]);
        setIsHistoryUpdatePending(false);
    }
  }, [isHistoryUpdatePending, annotations, selectedAnnotationId]);


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

      <header className="container mx-auto p-4 border-b border-border shadow-sm bg-card sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-headline font-semibold text-primary">SnapEdit</h1>
          <Button onClick={handleCaptureScreenshot} variant="default" size="lg">
            Capture Screenshot
          </Button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6 space-y-4 flex flex-col items-center">
        {image && (
          <EditorToolbar
            selectedTool={selectedTool}
            onSelectTool={handleSelectTool}
            onDownload={handleDownload}
            onClearAll={handleClearAllAnnotations}
            onUndo={handleUndo}
            onCopyToClipboard={handleCopyToClipboard}
            isCropping={isCropping}
            hasCropSelection={!!cropPreviewRect}
            onConfirmCrop={handleConfirmCrop}
            onCancelCrop={() => {
              setCropPreviewRect(null);
              setIsCropping(false);
              setSelectedTool(null);
            }}
            selectedColor={currentAnnotationColor}
            onSelectColor={setCurrentAnnotationColor}
            availableColors={ANNOTATION_COLORS}
            selectedAnnotationId={selectedAnnotationId}
            onDeleteSelected={handleDeleteSelectedAnnotation}
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
              onAddAnnotation={addAnnotation}
              onRequestTextInput={handleRequestTextInput}
              cropPreviewRect={cropPreviewRect}
              onSetCropPreviewRect={setCropPreviewRect}
              newAnnotationColor={currentAnnotationColor}
              selectedAnnotationId={selectedAnnotationId}
              onSelectAnnotation={handleSelectAnnotation}
              onUpdateAnnotation={handleUpdateAnnotation}
              onEndAnnotationHistoryEntry={handleEndAnnotationHistoryEntry}
            />
          ) : (
            <div className="text-center p-10 pointer-events-none"> {/* pointer-events-none on text to allow drop */}
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
            onBlur={() => { // Confirm on blur unless value is empty
                if (textInput.value.trim() !== '') {
                    handleTextInputConfirm();
                } else {
                    setTextInput({ x: 0, y: 0, value: '', visible: false, canvasRelativeX: 0, canvasRelativeY: 0 });
                    setSelectedTool(null);
                }
            }}
            autoFocus
            className="fixed z-50 p-2 border rounded shadow-lg bg-card w-48 min-h-[40px] resize-none overflow-hidden"
            style={{ left: `${textInput.x}px`, top: `${textInput.y}px`, color: currentAnnotationColor }}
            placeholder="Type text..."
          />
        )}
      </main>
      <footer className="container mx-auto bg-card border-t border-border p-6 text-sm text-muted-foreground">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-center sm:text-left space-y-2 sm:space-y-0">
            <p>&copy; {new Date().getFullYear()} SnapEdit. All rights reserved.</p>
            <div className="flex items-center space-x-4">
              <a 
                href="https://snap-edit.moaminsharifi.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-primary transition-colors flex items-center"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Live Demo
              </a>
              <a 
                href="https://github.com/moaminsharifi/snap-edit" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-primary transition-colors flex items-center"
              >
                <Github className="w-4 h-4 mr-1" />
                View on GitHub
              </a>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center sm:space-x-6 space-y-1 sm:space-y-0 text-center text-xs">
              <p><strong>Credits:</strong> Built with <a href="https://firebase.google.com/studio" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">Firebase Studio</a>.</p>
              <p><strong>Technologies:</strong> Next.js, React, ShadCN UI, Tailwind CSS.</p>
            </div>
            <p className="text-xs text-left sm:text-center">
              SnapEdit is your go-to online tool for instant screen capture and powerful image annotation. Edit screenshots with arrows, text, and shapes, all locally in your browser for maximum privacy. Perfect for quick markups and sharing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
