# Real-Time Collaborative Drawing Canvas (Advanced Edition)

A high-performance, multi-user collaborative drawing platform built with **Vanilla TypeScript**, **HTML5 Canvas API**, **Node.js**, and **Socket.IO**. Features an advanced vector shape engine, infinite pan & zoom matrix transformation camera, live shape ghosting preview, object selection, and native PNG/SVG export capabilities.

---

## Key Features

- **Manual Canvas Engine:** Custom-built 2D rendering pipeline using smooth quadratic bezier curves, high-DPI (`devicePixelRatio`) scaling, and `destination-out` erasing.
- **Extended Vector Shape Tools:** 
  - 🖌️ **Brush & Eraser:** Smooth freehand drawing with quadratic interpolation.
  - 📏 **Line:** Straight vector line paths.
  - ⬛ **Rectangle:** Stroked bounding boxes.
  - ⭕ **Ellipse:** Oval & circular geometry.
  - 🔤 **Text Annotation:** Direct text vector placement.
  - 🎯 **Select Tool:** Click to select shapes and render bounding box handles.
- **Infinite Canvas Pan & Zoom (Camera Matrix):**
  - Smooth camera panning (`Space + Drag` or `Middle Click`).
  - Mouse wheel zoom (`Ctrl + Wheel` / Pinch) anchored around pointer center (0.2x to 5.0x zoom).
- **Normalized World Coordinates:** Converts screen pixels to relative float scale ($x, y \in [0, 1]$), ensuring 100% pixel-perfect synchronization across different screen resolutions and zoom levels.
- **Optimistic Local Rendering & Live Ghosting:** 0ms local drawing feedback combined with live shape ghosting preview and `requestAnimationFrame` point batching (~16ms flush).
- **Server-Authoritative State:** Node.js server maintains the canonical operation log, assigns sequence numbers, and validates incoming WebSocket schemas.
- **Global Tombstone Undo / Redo:** Synchronized undo/redo operating on the shared room operation history via logical deletion (`active: false`).
- **User Presence & Remote Cursors:** Real-time presence list with server-assigned user colors and 30ms throttled remote cursor tracking rendered on an overlay DOM container.
- **Canvas Exporter Engine:** Export canvas as high-resolution **PNG** or scalable **Vector SVG** XML files.

---

## Tech Stack

- **Frontend:** TypeScript, HTML5 Canvas 2D API, Vanilla DOM APIs, CSS3 Tokens, Vite.
- **Backend:** Node.js, Express, Socket.IO, TypeScript.
- **Architecture:** Operation-Based State Synchronization + 2D Camera Matrix.

---

## Quick Start

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### 1. Installation
```bash
npm install
```

### 2. Running Locally (Development Mode)
Starts Vite dev server on `http://localhost:3000` and Node Socket.IO server on `http://localhost:5000`:
```bash
npm run dev
```

### 3. Production Build & Start
```bash
npm run build
npm start
```

---

## Keyboard Controls & UI Shortcuts

| Key / Control | Action |
| :--- | :--- |
| `B` | Switch to Brush Tool |
| `E` | Switch to Eraser Tool |
| `L` | Switch to Line Tool |
| `R` | Switch to Rectangle Tool |
| `O` | Switch to Ellipse Tool |
| `T` | Switch to Text Annotation Tool |
| `S` | Switch to Select Tool |
| `P` / `Space + Drag` | Pan Canvas Viewport |
| `Ctrl + Wheel` / `+/-` | Zoom In / Out |
| `Ctrl + Z` / `Cmd + Z` | Trigger Global Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Trigger Global Redo |
| `Width Slider` | Adjust stroke size (1px – 50px) |
| `Color Swatches` | Select drawing color |

---

## Technical Performance Decisions

1. **Camera Transformation Matrix:** Matrix operations (`ctx.translate`, `ctx.scale`) isolate viewport camera movements from World coordinates ($x, y$), avoiding heavy canvas redraw cycles while panning.
2. **Outbound Point Batching:** Points are queued and emitted via `requestAnimationFrame` (~16ms intervals), reducing WebSocket frame overhead by ~80%.
3. **Cursor Throttling:** Cursor movements are throttled to 30ms intervals (~33 updates/sec).
4. **Vector SVG Generation:** SVG exporter reconstructs canvas vector operations into native XML nodes (`<path>`, `<rect>`, `<ellipse>`, `<text>`) for loss-free vector editing.
