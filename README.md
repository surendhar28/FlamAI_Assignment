# Real-Time Collaborative Drawing Canvas

A multi-user drawing application built with **Vanilla TypeScript**, **HTML5 Canvas API**, **Node.js**, and **Socket.IO**. Enables multiple users to draw simultaneously on a shared canvas in real-time with zero-latency local feedback, event batching, user presence tracking, and server-authoritative global undo/redo.

---

## Features

- **Manual Canvas Engine:** Custom-built 2D rendering pipeline using smooth quadratic bezier curves, high-DPI (`devicePixelRatio`) scaling, and `destination-out` erasing.
- **Normalized Coordinate System:** Converts all points to relative float scale ($x, y \in [0, 1]$), ensuring consistent stroke positioning across heterogeneous client screen resolutions.
- **Optimistic Local Rendering:** Immediate 0ms local drawing feedback combined with `requestAnimationFrame`-driven network event batching (~16ms flush).
- **Server-Authoritative State:** Node.js server maintains the canonical operation log, assigns sequence numbers, and validates incoming WebSocket messages.
- **Global Tombstone Undo / Redo:** Synchronized undo/redo operating on the shared room operation history via logical deletion (`active: false`) rather than popping local arrays.
- **User Presence & Remote Cursors:** Real-time presence list with server-assigned user colors and 30ms throttled remote cursor tracking rendered on a separate DOM overlay.
- **Resilient Reconnection:** Automatic Socket.IO state synchronization catching up missed operations upon connection recovery.

---

## Tech Stack

- **Frontend:** TypeScript, HTML5 Canvas 2D API, Vanilla DOM APIs, CSS3 Tokens, Vite.
- **Backend:** Node.js, Express, Socket.IO, TypeScript.
- **Architecture:** Operation-Based State Synchronization.

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

## Testing Collaboration with Multiple Users

1. Start the server via `npm run dev`.
2. Open `http://localhost:3000` in **Window 1**.
3. Open `http://localhost:3000` in **Window 2** (or `http://localhost:3000/?room=custom-room` to test rooms).
4. Draw in Window 1 — observe live streaming strokes appearing smoothly in Window 2.
5. Move your cursor in Window 1 — observe the remote cursor indicator tracking in Window 2.
6. Click **Undo** in Window 2 — observe the latest global stroke deactivate synchronously across both windows.

---

## Keyboard Controls & UI Shortcuts

| Key / Control | Action |
| :--- | :--- |
| `B` | Switch to Brush Tool |
| `E` | Switch to Eraser Tool |
| `Ctrl + Z` / `Cmd + Z` | Trigger Global Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Trigger Global Redo |
| `Width Slider` | Adjust stroke size (1px – 50px) |
| `Color Swatches` | Select drawing color |

---

## Technical Performance Decisions

1. **Operation-Based Vector Sync:** We transmit lightweight points ($x, y, \text{color}, \text{width}$) instead of heavy canvas binary screenshots (`toDataURL()`), keeping network payloads under 200 bytes per frame.
2. **Outbound Point Batching:** Points are queued and emitted via `requestAnimationFrame` (~16ms intervals), reducing WebSocket frame overhead by ~80% compared to unthrottled `mousemove` events.
3. **Cursor Throttling:** Cursor movements are throttled to 30ms intervals (~33 updates/sec), isolating non-drawing presence data from stroke data channels.
4. **Overlay Cursor Layer:** Cursors are rendered on an overlay HTML DOM container (`#cursor-overlay`), keeping main drawing canvas redraws completely free from cursor invalidation cycles.
