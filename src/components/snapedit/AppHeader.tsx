
import React from 'react';
import { Button } from '@/components/ui/button';

interface AppHeaderProps {
  onCaptureScreenshot: () => void;
}

export function AppHeader({ onCaptureScreenshot }: AppHeaderProps) {
  return (
    <header className="container mx-auto p-4 border-b border-border shadow-sm bg-card sticky top-0 z-50">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline font-semibold text-primary">SnapEdit</h1>
        <Button onClick={onCaptureScreenshot} variant="default" size="lg">
          Capture Screenshot
        </Button>
      </div>
    </header>
  );
}
