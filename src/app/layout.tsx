
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'SnapEdit - Easy Screenshot Capture & Annotation Tool',
  description: 'SnapEdit: Instantly capture your screen, annotate with powerful tools (arrows, text, shapes), and share your screenshots. Fast, local, and privacy-focused editor.',
  icons: { icon: '/SnapEdit-logo.png' },
  keywords: ['screenshot', 'capture', 'annotation', 'edit', 'screen grab', 'image editor', 'local processing', 'privacy', 'markup tool', 'screen capture software'],
  openGraph: {
    title: 'SnapEdit - Easy Screenshot Capture & Annotation Tool',
    description: 'Instantly capture your screen, annotate with powerful tools, and share. Fast, local, and privacy-focused.',
    type: 'website',
    images: [
      {
        url: '/SnapEdit-Web.png',
        width: 1200,
        height: 630,
        // Since this is purely metadata, we'll just note to replace it.
      },
 {url: 'https://raw.githubusercontent.com/moaminsharifi/snap-edit/refs/heads/master/docs/SnapEdit-logo.png'},
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnapEdit - Easy Screenshot Capture & Annotation Tool',
    description: 'Instantly capture your screen, annotate with powerful tools, and share. Fast, local, and privacy-focused.',
    images: ['https://raw.githubusercontent.com/moaminsharifi/snap-edit/refs/heads/master/docs/SnapEdit-Web.png'],
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
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
          <meta
            name="google-site-verification"
            content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}
          />
        )}
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
