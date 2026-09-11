# Real-Time Collaborative 3D Spatial Canvas Engine

An enterprise-grade, multi-user **Real-Time 3D Spatial Canvas & 3D Modeling Studio** built with **TypeScript**, **Three.js WebGL 3D API**, **Node.js**, and **Socket.IO**. Features 3D freehand ribbon drawing, 3D mesh primitives (cubes, spheres, cylinders), 3D perspective camera navigation, 3D raycasting, real-time spatial user presence cursors, and Wavefront `.obj` 3D model export capabilities.

---

## 🧊 3D Spatial Capabilities Breakdown

- **Three.js WebGL 3D Engine:** High-performance WebGL 3D viewport featuring perspective camera, directional lighting, shadows, 3D grid helper, and axis orientation.
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
- **3D Real-Time User Presence:** Peer cursors rendered as 3D spatial pointer cones with floating 3D text tags tracking live peer movements in 3D WebGL space.
- **Server-Authoritative Tombstone Undo / Redo:** Synchronized global undo/redo operating on the shared room operation history via logical deletion (`active: false`).
- **3D Model Export Engine:** Export spatial drawings directly into native **Wavefront OBJ 3D Model files (`.obj`)** for editing in Blender, Maya, or Unreal Engine, or capture 3D PNG snapshots!

---

## Tech Stack

- **Frontend:** TypeScript, Three.js WebGL 3D API, HTML5 Canvas, Vite.
- **Backend:** Node.js, Express, Socket.IO, TypeScript.
- **Architecture:** Operation-Based 3D Vector & Mesh Synchronization.

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
| `B` | 3D Freehand Ribbon Tool |
| `E` | Eraser Tool |
| `X` | 3D Box / Cube Primitive |
| `S` | 3D Sphere Primitive |
| `C` | 3D Cylinder Primitive |
| `L` | 3D Straight Line |
| `T` | 3D Text Annotation Tool |
| `O` / `Right Click Drag` | Orbit / Rotate 3D Camera |
| `Mouse Wheel` | 3D Camera Zoom (Dolly In/Out) |
| `Ctrl + Z` / `Cmd + Z` | Global Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Global Redo |
