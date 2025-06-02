
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'SnapEdit - Easy Screenshot Capture & Annotation Tool',
  description: 'SnapEdit: Instantly capture your screen, annotate with powerful tools (arrows, text, shapes), and share your screenshots. Fast, local, and privacy-focused editor.',
  keywords: ['screenshot', 'capture', 'annotation', 'edit', 'screen grab', 'image editor', 'local processing', 'privacy', 'markup tool', 'screen capture software'],
  openGraph: {
    title: 'SnapEdit - Easy Screenshot Capture & Annotation Tool',
    description: 'Instantly capture your screen, annotate with powerful tools, and share. Fast, local, and privacy-focused.',
    type: 'website',
    images: [
      {
        url: 'https://placehold.co/1200x630.png', // Replace with your actual app image URL
        width: 1200,
        height: 630,
        alt: 'SnapEdit Application Interface',
        // The data-ai-hint attribute for an og:image should be on an actual <img> tag if rendered on a page,
        // but for metadata, it's more about reminding the developer. For consistency with image guidelines,
        // if this URL were used in an <meta property="og:image" content="..."/> and then an actual <img src="..."/>
        // for preview on a page, the <img> tag would get the data-ai-hint.
        // Since this is purely metadata, we'll just note to replace it.
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnapEdit - Easy Screenshot Capture & Annotation Tool',
    description: 'Instantly capture your screen, annotate with powerful tools, and share. Fast, local, and privacy-focused.',
    images: ['https://placehold.co/1200x630.png'], // Replace with your actual app image URL
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
