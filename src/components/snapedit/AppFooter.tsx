
import React from 'react';
import { Github, ExternalLink } from 'lucide-react';

export function AppFooter() {
  return (
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
  );
}
