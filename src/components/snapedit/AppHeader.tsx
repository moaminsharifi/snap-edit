
import React from 'react';
import { Button } from '@/components/ui/button';

interface AppHeaderProps {
  onCaptureScreenshot: () => void;
}

export function AppHeader({ onCaptureScreenshot }: AppHeaderProps) {
  return (
    <header className="container mx-auto p-4 border-b border-border shadow-sm bg-card sticky top-0 z-50">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-0">
        <h1 className="text-3xl font-headline font-semibold text-primary text-center sm:text-left">SnapEdit</h1>
        <Button onClick={onCaptureScreenshot} variant="default" size="lg" className="w-full sm:w-auto">
          Capture Screenshot
        </Button>
      </div>
    </header>
  );
}
