# Real-Time Collaborative Canvas Engine (Elevated Edition)

An enterprise-grade, multi-user collaborative drawing platform built with **Vanilla TypeScript**, **HTML5 Canvas 2D API**, **Node.js**, and **Socket.IO**. Features vector shapes, infinite pan/zoom camera matrix, smart grid snapping, multi-layer management, real-time object selection/dragging, live time-lapse drawing replay, and native PNG/SVG export capabilities.

---

## 🔥 Elevated Features Breakdown

- **Manual Canvas 2D Engine:** Custom rendering pipeline using smooth quadratic bezier curves, high-DPI (`devicePixelRatio`) scaling, and `destination-out` erasing.
- **Extended Vector Shape Suite:**
  - 🖌️ **Brush & Eraser:** Smooth freehand drawing with quadratic interpolation.
  - 📏 **Line:** Straight vector lines with optional 45° Shift angle locking.
  - ⬛ **Rectangle:** Stroked bounding boxes with Shift-key square constraining.
  - ⭕ **Ellipse:** Oval geometry with Shift-key perfect circle constraining.
  - 🔤 **Text Annotation:** Direct text vector placement.
  - 🎯 **Select & Move Tool:** Click to select shapes, show bounding handles, and drag-to-move vectors across the canvas.
- **Smart Grid & Snapping System:**
  - Toggleable **Dots**, **Grid Mesh**, or **None** background patterns.
  - 🧲 **Snap-to-Grid:** Automatic 20px grid step alignment for precise engineering diagrams.
- **Multi-Layer Management System (Layers Panel):**
  - Create custom canvas layers (`Layer 1`, `Layer 2`, etc.).
  - Toggle layer visibility (👁️ Hide/Show) and lock protection (🔒 Lock/Unlock).
- **Live Time-Lapse Replay Engine:**
  - Interactive playback control bar: `▶️ Play`, `⏸️ Pause`, Timeline Scrubbing Slider (`0` to `N` operations), and Speed multiplier (`1x`, `2x`, `4x`).
  - Replays the drawing construction step-by-step from initial operation sequence.
- **Infinite Canvas Pan & Zoom (Camera Matrix):**
  - Smooth camera panning (`Space + Drag` or `Middle Click`).
  - Mouse wheel zoom (`Ctrl + Wheel` / Pinch) anchored around pointer center (0.2x to 5.0x zoom).
- **Normalized World Coordinates:** Converts screen pixels to relative float scale ($x, y \in [0, 1]$), ensuring 100% pixel-perfect synchronization across different screen resolutions and zoom levels.
- **Server-Authoritative Tombstone Undo / Redo:** Synchronized undo/redo operating on the shared room operation history via logical deletion (`active: false`).
- **Canvas Exporter Engine:** Export canvas as high-resolution **PNG** or scalable **Vector SVG** XML files.

---

## Tech Stack

- **Frontend:** TypeScript, HTML5 Canvas 2D API, Vanilla DOM APIs, CSS3 Tokens, Vite.
- **Backend:** Node.js, Express, Socket.IO, TypeScript.
- **Architecture:** Operation-Based Vector State Synchronization + 2D Camera Matrix.

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

| Key / Control | Tool / Action |
| :--- | :--- |
| `B` | Brush Tool |
| `E` | Eraser Tool |
| `L` | Straight Line Tool (Hold `Shift` for 45° Snap) |
| `R` | Rectangle Tool (Hold `Shift` for Square) |
| `O` | Ellipse Tool (Hold `Shift` for Circle) |
| `T` | Text Annotation Tool |
| `S` | Select Tool (Click & Drag Objects) |
| `P` / `Space + Drag` | Pan Canvas Viewport |
| `Shift + Drag` | Constrain Aspect Ratio / Snap Angles |
| `Ctrl + Wheel` / `+` / `-` | Zoom In / Out |
| `Ctrl + Z` / `Cmd + Z` | Global Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Global Redo |
