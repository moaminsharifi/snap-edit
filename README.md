
# SnapEdit - Easy Screenshot Capture & Annotation Tool

SnapEdit is a Next.js application built in Firebase Studio that allows users to instantly capture their screen, annotate with powerful tools (arrows, text, shapes), and share their screenshots. It's designed to be fast, with all processing done locally in the browser for enhanced privacy.

**Live Demo:** [https://snap-edit.moaminsharifi.com/](https://snap-edit.moaminsharifi.com/)

**GitHub Repository:** [https://github.com/moaminsharifi/snap-edit](https://github.com/moaminsharifi/snap-edit)

## Features

-   **Screen Capture:** Quickly capture your entire screen, a specific window, or a browser tab.
-   **Annotation Tools:**
    -   Crop
    -   Rectangle
    -   Circle
    -   Arrow
    -   Text
-   **Color Palette:** Choose from 12 distinct colors for your annotations.
-   **Undo Functionality:** Revert your last action.
-   **Clear Canvas:** Start fresh by clearing all annotations.
-   **Download Image:** Save your edited screenshot as a PNG file.
-   **Copy to Clipboard:** Easily copy the edited image to your clipboard.
-   **Local Processing:** All image processing and annotations happen client-side, ensuring your data stays private.
-   **Responsive Design:** Works on various screen sizes.
-   **Built with Modern Tech:** Next.js, React, ShadCN UI, Tailwind CSS.

## Getting Started

This project is a Next.js starter designed to be used within Firebase Studio.

1.  **Explore the Code:** Take a look at `src/app/page.tsx` to see the main entry point and `src/components/snapedit/SnapEditApp.tsx` for the core application logic.
2.  **Run Locally (if outside Firebase Studio):**
    ```bash
    npm install
    npm run dev
    ```
    This will start the Next.js development server, typically on `http://localhost:9002`.

## How It Works

SnapEdit utilizes browser APIs for screen capture (`navigator.mediaDevices.getDisplayMedia`) and the HTML Canvas API for image manipulation and annotation. All operations are performed in the user's browser, meaning no images are uploaded to any server, ensuring user privacy.

## Key Components

-   `src/app/page.tsx`: The main page that renders the SnapEdit application.
-   `src/app/layout.tsx`: Defines the root layout, including metadata for SEO.
-   `src/components/snapedit/SnapEditApp.tsx`: The core component that manages state, user interactions, and orchestrates the various parts of the editor.
-   `src/components/snapedit/EditorToolbar.tsx`: Provides the UI for selecting tools, colors, and actions like download, clear, undo, and copy.
-   `src/components/snapedit/ScreenshotCanvas.tsx`: Handles the rendering of the image and annotations on an HTML canvas, and processes drawing interactions.
-   `src/components/ui/`: Contains ShadCN UI components used throughout the application.

## Privacy

User privacy is a key consideration. SnapEdit processes all images and annotations directly on the user's device. No screenshot data is sent to or stored on any external server.

---

This project was bootstrapped with Firebase Studio.
