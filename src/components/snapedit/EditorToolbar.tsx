
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Crop, Square, Circle as CircleIcon, ArrowUpRight, Type, Download, Trash2, Undo2, Check, X, Palette, ClipboardCopy, MousePointer2, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Tool = 'crop' | 'rect' | 'circle' | 'arrow' | 'text' | 'select';

interface EditorToolbarProps {
  selectedTool: Tool | null;
  onSelectTool: (tool: Tool | null) => void;
  onDownload: () => void;
  onClearAll: () => void;
  onUndo: () => void;
  onCopyToClipboard: () => void;
  isCropping: boolean;
  hasCropSelection: boolean;
  onConfirmCrop: () => void;
  onCancelCrop: () => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  availableColors: string[];
  selectedAnnotationId: string | null;
  onDeleteSelected: () => void;
}

const toolsList: { name: Tool; icon: React.ElementType; label: string }[] = [
  { name: 'select', icon: MousePointer2, label: 'Select/Move' },
  { name: 'crop', icon: Crop, label: 'Crop' },
  { name: 'rect', icon: Square, label: 'Rectangle' },
  { name: 'circle', icon: CircleIcon, label: 'Circle' },
  { name: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
  { name: 'text', icon: Type, label: 'Text' },
];

const drawingTools: Tool[] = ['rect', 'circle', 'arrow', 'text'];

export function EditorToolbar({
  selectedTool,
  onSelectTool,
  onDownload,
  onClearAll,
  onUndo,
  onCopyToClipboard,
  isCropping,
  hasCropSelection,
  onConfirmCrop,
  onCancelCrop,
  selectedColor,
  onSelectColor,
  availableColors,
  selectedAnnotationId,
  onDeleteSelected,
}: EditorToolbarProps) {

  const handleToolClick = (toolName: Tool) => {
    if (selectedTool === toolName && toolName !== 'select') { // Allow select to be re-clicked without deselecting
      onSelectTool(null);
    } else {
      onSelectTool(toolName);
    }
  };
  
  const showColorPalette = selectedTool && drawingTools.includes(selectedTool) && !isCropping;

  return (
    <TooltipProvider>
      <div className="p-2 bg-card rounded-lg shadow-md border border-border flex flex-col gap-2 items-center w-full max-w-xl">
        <div className="flex flex-wrap gap-2 justify-center items-center">
          {!isCropping ? (
            <>
              {toolsList.map((tool) => (
                <Tooltip key={tool.name}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedTool === tool.name ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => handleToolClick(tool.name)}
                      aria-label={tool.label}
                      className="w-12 h-12"
                    >
                      <tool.icon className="w-6 h-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tool.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              <div className="h-8 w-px bg-border mx-2"></div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onUndo} aria-label="Undo" className="w-12 h-12">
                    <Undo2 className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Undo Last Action</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={onDeleteSelected} 
                    aria-label="Delete Selected" 
                    className="w-12 h-12"
                    disabled={!selectedAnnotationId || selectedTool !== 'select'}
                  >
                    <Trash2 className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Delete Selected Annotation</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onClearAll} aria-label="Clear All Annotations" className="w-12 h-12">
                    <Eraser className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Clear All Annotations</p></TooltipContent>
              </Tooltip>
               <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onCopyToClipboard} aria-label="Copy to Clipboard" className="w-12 h-12">
                    <ClipboardCopy className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Copy to Clipboard</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" onClick={onDownload} aria-label="Download Image" className="w-12 h-12">
                    <Download className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Download Image</p></TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground mr-2">Cropping:</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={onConfirmCrop}
                    disabled={!hasCropSelection}
                    aria-label="Confirm Crop"
                    className="w-12 h-12 bg-green-500 hover:bg-green-600"
                  >
                    <Check className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Confirm Crop</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={onCancelCrop}
                    aria-label="Cancel Crop"
                    className="w-12 h-12"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Cancel Crop</p></TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        <div
          className={cn(
            "w-full overflow-hidden transition-all duration-300 ease-in-out",
            showColorPalette
              ? "mt-2 pt-2 border-t border-border max-h-40 opacity-100"
              : "max-h-0 opacity-0"
          )}
        >
          {showColorPalette && (
            <div className="flex flex-wrap gap-2 justify-center items-center">
              <Palette className="w-5 h-5 mr-2 text-muted-foreground" />
              {availableColors.map((color) => (
                <Tooltip key={color}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelectColor(color)}
                      className={cn(
                        "w-7 h-7 rounded-full border-2 hover:opacity-80 transition-opacity",
                        selectedColor === color ? 'ring-2 ring-offset-2 ring-primary' : 'border-muted-foreground/50',
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent><p>{color}</p></TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
