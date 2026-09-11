# Real-Time Collaborative 3D Spatial Canvas Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black.svg)](https://threejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-green.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An enterprise-grade, multi-user **Real-Time 3D Spatial Canvas & 3D Modeling Studio** built with **TypeScript**, **Three.js WebGL 3D API**, **Node.js**, and **Socket.IO**. Features 3D freehand ribbon drawing, 3D mesh primitives (cubes, spheres, cylinders), 3D perspective camera navigation, 3D raycasting, real-time spatial user presence cursors, smart grid snapping, multi-layer management, live time-lapse replay, and Wavefront `.obj` 3D model export capabilities.

---

## 🎨 System Overview & Highlights

- **Three.js WebGL 3D Engine:** High-performance WebGL 3D viewport featuring perspective camera, directional lighting with real-time shadows, 3D grid helper, and axis orientation.
- **3D Spatial Tool Suite:**
  - 🖌️ **3D Ribbon Brush:** Freehand 3D spatial curves drawn using Catmull-Rom tube geometries (`THREE.TubeGeometry`).
  - 🧹 **3D Eraser:** Removes target 3D meshes in spatial world space.
  - 🧊 **3D Box / Cube:** Interactive 3D cuboid mesh primitives (`THREE.BoxGeometry`).
  - 🔮 **3D Sphere:** High-resolution 3D spatial spheres (`THREE.SphereGeometry`).
  - 🛢️ **3D Cylinder:** 3D cylindrical geometries (`THREE.CylinderGeometry`).
  - 📏 **3D Straight Line:** 3D vector lines in spatial world.
  - 🔤 **3D Text Annotation:** Floating 3D spatial text label sprites.
  - 🎯 **3D Select Tool:** Click 3D objects to display interactive 3D bounding box helpers (`THREE.BoxHelper`).
- **3D Camera Navigation & View Angle Presets:**
  - 🎲 **Isometric View:** Preset $45^\circ$ spatial perspective.
  - ⬆️ **Top View:** Overhead 2D-style projection.
  - 👁️ **Front View:** Eye-level 3D perspective.
  - ➡️ **Side View:** Orthogonal side projection.
  - 🌐 **3D Orbit & Pan:** Drag with **Right Click** or select **Orbit** to rotate camera in 3D space; mouse wheel to zoom in/out ($5 \dots 100$ radius units).
- **3D Raycasting Engine:** Converts 2D screen pointer mouse events ($clientX, clientY$) into 3D World Spatial Coordinates $(X, Y, Z)$ by intersecting 3D planes using `THREE.Raycaster`.
- **Smart Grid & 20px Snapping System:**
  - Toggleable **Dots**, **Grid Mesh**, or **None** background patterns.
  - 🧲 **Snap-to-Grid:** Automatic 20px grid step alignment for precise engineering diagrams.
- **Multi-Layer Management System (Layers Panel):**
  - Create custom canvas layers (`Layer 1`, `Layer 2`, etc.).
  - Toggle layer visibility (👁️ Hide/Show) and lock protection (🔒 Lock/Unlock).
- **Live Time-Lapse Replay Engine:**
  - Interactive playback control bar: `▶️ Play`, `⏸️ Pause`, Timeline Scrubbing Slider (`0` to `N` operations), and Speed multiplier (`1x`, `2x`, `4x`).
  - Replays the drawing construction step-by-step from initial operation sequence.
- **3D Real-Time User Presence:** Peer cursors rendered as 3D spatial pointer cones with floating 3D text tags tracking live peer movements in 3D WebGL space.
- **Server-Authoritative Tombstone Undo / Redo:** Synchronized global undo/redo operating on the shared room operation history via logical deletion (`active: false`).
- **3D Model Export Engine:** Export spatial drawings directly into native **Wavefront OBJ 3D Model files (`.obj`)** for editing in Blender, Maya, or Unreal Engine, or capture 3D PNG snapshots!

---

## 🛠️ Project Folder Structure

```text
collaborative-canvas/
│
├── client/
│   ├── index.html                    # Single-page WebGL app shell UI
│   ├── styles.css                    # Dark-mode glassmorphic styling & layouts
│   ├── vite.config.ts                # Vite bundler configuration
│   └── src/
│       ├── main.ts                   # WebGL App bootstrapping & loop coordinator
│       ├── canvas/
│       │   ├── Canvas3DManager.ts    # Three.js WebGL renderer, perspective camera, 3D grid
│       │   ├── Drawing3DRenderer.ts  # 3D tube ribbons, boxes, spheres, cylinders, selection boxes
│       │   └── Input3DHandler.ts     # 3D raycasting pointer events & orbit navigation
│       ├── network/
│       │   └── SocketClient.ts       # Socket.IO client, RAF point batching & cursor throttling
│       ├── state/
│       │   └── DrawingStore.ts       # Client state store (3D operation log & presence list)
│       ├── ui/
│       │   ├── Toolbar.ts            # 3D tools, camera view buttons, palette, undo/redo
│       │   ├── LayersPanel.ts        # Multi-layer management sidebar component
│       │   ├── ReplayBar.ts          # Time-lapse drawing replay timeline bar
│       │   ├── Cursors3D.ts          # 3D spatial presence cursors overlay
│       │   ├── UserList.ts           # Online users list DOM component
│       │   └── StatusIndicator.ts    # Connection status pill
│       └── utils/
│           └── Exporter3D.ts         # Wavefront OBJ 3D model & PNG image exporter
│
├── server/
│   ├── tsconfig.json                 # Node.js server TypeScript configuration
│   └── src/
│       ├── server.ts                 # Express + Socket.IO server & event router
│       ├── RoomManager.ts            # Multi-room coordinator & user color assignment
│       ├── DrawingState.ts           # Canonical room log & tombstone global undo/redo
│       └── utils/
│           └── validation.ts         # Server-side 3D payload schema validator
│
├── shared/
│   └── protocol.ts                   # Shared 3D TypeScript interfaces (Point3D, Operations)
│
├── package.json                      # Workspace dependencies & build scripts
├── tsconfig.json                     # Root TypeScript configuration
├── README.md                         # Project documentation
└── ARCHITECTURE.md                   # Technical 3D engineering & scaling architecture
```

---

## ⚡ Quick Start

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

## ⌨️ Keyboard Shortcuts & Controls Matrix

| Key / Control | Tool / Action |
| :--- | :--- |
| `B` | 3D Freehand Ribbon Brush |
| `E` | 3D Eraser Tool |
| `X` | 3D Box / Cube Mesh |
| `S` | 3D Sphere Mesh |
| `C` | 3D Cylinder Mesh |
| `L` | 3D Straight Line |
| `T` | 3D Text Annotation Tool |
| `O` / `Right Click Drag` | Orbit / Rotate 3D Camera |
| `Mouse Wheel` | 3D Camera Dolly Zoom (In / Out) |
| `Ctrl + Z` / `Cmd + Z` | Global Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Global Redo |
| `🎲 Iso / ⬆️ Top / 👁️ Front` | Switch 3D View Angle Presets |
| `🧊 3D OBJ` | Export 3D Mesh Model File (`.obj`) |

---

## 🧪 Testing Collaboration with Multiple Users

1. Start the server via `npm run dev`.
2. Open `http://localhost:3000` in **Window 1**.
3. Open `http://localhost:3000` in **Window 2** (or `http://localhost:3000/?room=custom-room` to test rooms).
4. Select **3D Box** in Window 1 and drag on the WebGL canvas — observe the 3D box appear in real-time in Window 2.
5. Move mouse in Window 1 — observe the remote 3D cursor tracking in Window 2.
6. Click **Undo** in Window 2 — observe the 3D mesh deactivate synchronously across both client viewports.
