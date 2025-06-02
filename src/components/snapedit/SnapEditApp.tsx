
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
import { Github, ExternalLink } from 'lucide-react';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LOCAL_STORAGE_INTRO_KEY = 'snapEditIntroShown';

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
  
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string; visible: boolean; canvasRelativeX: number, canvasRelativeY: number }>({ x: 0, y: 0, value: '', visible: false, canvasRelativeX: 0, canvasRelativeY: 0 });
  const [cropPreviewRect, setCropPreviewRect] = useState<CropRect | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

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
  
  const handleClearCanvas = () => {
    if (image) {
       updateHistory([]);
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
      setIsCropping(false);
      setCropPreviewRect(null);
    }
  }, [selectedTool, isCropping]);


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

      <header className="p-4 border-b border-border shadow-sm bg-card sticky top-0 z-50">
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
              newAnnotationColor={currentAnnotationColor}
            />
          ) : (
            <div className="text-center p-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image-plus mx-auto mb-4 text-muted-foreground"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <h2 className="text-xl font-semibold text-foreground mb-2">No Image Captured</h2>
              <p className="text-muted-foreground">Click "Capture Screenshot" above to get started, or drag and drop an image here.</p>
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
            style={{ left: `${textInput.x}px`, top: `${textInput.y}px`, color: currentAnnotationColor }}
            placeholder="Type text..."
          />
        )}
      </main>
      <footer className="bg-card border-t border-border p-6 text-sm text-muted-foreground">
        <div className="container mx-auto space-y-4">
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
          
          <div className="text-center text-xs space-y-1">
            <p>
              <strong>Credits:</strong> Built with <a href="https://firebase.google.com/studio" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">Firebase Studio</a>.
            </p>
            <p>
              <strong>Technologies:</strong> Powered by Next.js, React, ShadCN UI, Tailwind CSS.
            </p>
            <p>
              <strong>SEO:</strong> Carefully crafted metadata ensures you can find us. See <code>src/app/layout.tsx</code>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
