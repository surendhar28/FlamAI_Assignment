# Technical Architecture & 3D Engineering Documentation

## 1. 3D Architecture Overview

The Collaborative 3D Spatial Canvas is engineered around a **3D Operation-Based Vector & Mesh Synchronization Model**. The application treats spatial drawing and 3D modeling as a stream of immutable 3D operations rather than heavy 3D mesh scene blobs.

```text
  [ User Pointer Input (clientX, clientY) ]
                      │
                      ▼
   ┌─────────────────────────────────────┐
   │     THREE.Raycaster Intersect       │  (Converts screen pixels to 3D World X, Y, Z)
   └──────────────────┬──────────────────┘
                      │
     ┌────────────────┴─────────────────────────┐
     ▼                                          ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│ Immediate WebGL Render  │         │ Point Batcher & RAF     │
│   (0ms Latency View)    │         └────────────┬────────────┘
└─────────────────────────┘                      │ (Batched 3D Points)
                                                 ▼
                                    ┌─────────────────────────┐
                                    │     SocketClient        │
                                    └────────────┬────────────┘
                                                 │ WebSocket Frame
                                                 ▼
                                    ┌─────────────────────────┐
                                    │   Socket.IO Server      │
                                    │   - Schema Validation   │
                                    │   - Assign Sequence #   │
                                    │   - Canonical History   │
                                    └────────────┬────────────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    ▼                         ▼
                        ┌───────────────────────┐ ┌───────────────────────┐
                        │   Remote Client A     │ │   Remote Client B     │
                        │ (Render 3D Mesh)      │ │ (Render 3D Mesh)      │
                        └───────────────────────┘ └───────────────────────┘
```

---

## 2. 3D State Model

Every spatial stroke or 3D primitive is represented by a `DrawingOperation` object containing 3D spatial points:

```ts
export interface Point3D {
  x: number; // Spatial X-coordinate in 3D world space
  y: number; // Spatial Y-coordinate in 3D world space
  z: number; // Spatial Z-coordinate in 3D world space
}

export interface DrawingOperation {
  id: string;          // Unique client UUID
  sequence: number;    // Server-assigned sequence integer
  userId: string;      // Author socket ID
  tool: 'brush' | 'eraser' | 'line' | 'box' | 'sphere' | 'cylinder' | 'text' | 'select' | 'orbit';
  color: string;       // Hex color string
  width: number;       // Line width / 3D mesh radius in world units
  points: Point3D[];   // Collection of 3D spatial points
  text?: string;       // Text content for 3D annotations
  layerId?: string;    // Target canvas layer ID
  active: boolean;     // True = rendered, False = undone (tombstone)
}
```

---

## 3. 3D Raycasting Engine (Screen -> 3D World Transformation)

To translate 2D screen pointer mouse events ($clientX, clientY$) into 3D Spatial World Coordinates $(X, Y, Z)$:

1. **Normalized Device Coordinates (NDC):**
   $$x_{ndc} = \left(\frac{clientX - canvas.left}{canvas.width}\right) \times 2 - 1$$
   $$y_{ndc} = -\left(\frac{clientY - canvas.top}{canvas.height}\right) \times 2 + 1$$
2. **Raycaster Intersect:**
   A `THREE.Raycaster` projects a ray from the camera origin through $(x_{ndc}, y_{ndc})$ into the 3D scene.
3. **Plane Intersection:**
   The ray intersects an implicit 3D drawing ground plane ($\mathbf{N} = (0, 1, 0), d = 0$), yielding the exact 3D spatial coordinates $(X, Y, Z)$ where the cursor touches the 3D world.

---

## 4. WebSocket Protocol Specification

All communication between client and server uses strongly-typed Socket.IO event payloads:

| Event Name | Sender | Payload Schema | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | Client | `{ roomId: string; username?: string }` | Client joins a room instance |
| `room_state` | Server | `{ roomId, users, operations, layers, myUser }` | Transmits canonical 3D state to new/reconnecting user |
| `stroke_start` | Client | `{ operationId, tool, color, width, point, text, layerId }` | Signals new 3D stroke/mesh creation |
| `stroke_start` | Server | `{ operationId, sequence, userId, tool, color, width, point }` | Broadcasts new 3D stroke start with sequence |
| `stroke_chunk` | Client | `{ operationId, points }` | Transmits batched 3D points payload |
| `stroke_chunk` | Server | `{ operationId, userId, points }` | Broadcasts batched 3D points to peers |
| `stroke_end` | Client/Server | `{ operationId, userId }` | Finalizes 3D stroke operation |
| `cursor_move` | Client | `{ position: Point3D }` | Throttled 3D cursor position emission |
| `cursor_update`| Server | `{ userId, position: Point3D }` | Broadcasts peer 3D cursor position |
| `undo` | Client | `{}` | Requests undoing latest global active operation |
| `redo` | Client | `{}` | Requests redoing latest global inactive operation |
| `operation_undone` | Server | `{ operationId }` | Directs all clients to mark operation inactive |
| `operation_redone` | Server | `{ operationId }` | Directs all clients to mark operation active |

---

## 5. Global Undo / Redo Strategy (Tombstones in 3D Space)

Undo operates on the **global room history**, not just the local user's strokes.

### Mechanism:
1. When any client sends an `undo` request, the Node.js server scans the room's canonical operation history backwards starting from the most recent stroke.
2. The server locates the latest operation with `active === true` and sets `active = false` (tombstone marking).
3. The server broadcasts `operation_undone` with `operationId` to all room clients.
4. Clients update their local state store and trigger a full 3D scene reconstruction (`reconstruct3DScene()`), removing the target Three.js mesh from the WebGL scene and redrawing only active operations ordered by `sequence`.

---

## 6. Time-Lapse Drawing Replay Engine

Because operations are stored with server sequence numbers, time-lapse replay is executed cleanly:
1. During playback, a timer steps through the operation array (`sequence: 0 ... N`) at variable speeds ($1\times, 2\times, 4\times$).
2. Calls `renderer3D.reconstruct3DScene(operations.slice(0, replayIndex))` for each step.
3. Animates the complete 3D scene construction step-by-step from initial operation.

---

## 7. Wavefront OBJ 3D Model Exporter Algorithm

The 3D model exporter converts canonical 3D operations directly into native Wavefront `.obj` XML strings:
- **3D Cubes / Boxes:** Generates 8 corner vertices (`v x y z`) and 12 triangular faces (`f v1 v2 v3`).
- **3D Freehand Strokes:** Generates sequential 3D curve vertices (`v x y z`) and line elements (`l v1 v2 ...`).
- **File Output:** Downloads the generated content as a downloadable `.obj` file for Blender, Maya, or Unreal Engine.

---

## 8. Horizontal Scaling Architecture (1,000+ Concurrent Users)

To scale from a single Node.js instance to thousands of concurrent users across hundreds of active rooms:

```text
               [ Client Traffic ]
                       │
                       ▼
             [ NGINX Load Balancer ]
             (Sticky Sessions / WSS)
                       │
        ┌──────────────┼──────────────┐
        ▼                             ▼
┌───────────────┐             ┌───────────────┐
│ Node Server 1 │             │ Node Server 2 │
└───────┬───────┘             └───────┬───────┘
        │                             │
        └──────────────┬──────────────┘
                       ▼
              [ Redis Pub/Sub ]
            (Socket.IO Redis Adapter)
                       │
                       ▼
            [ PostgreSQL / Redis ]
         (3D Room State Snapshots)
```

1. **Socket.IO Redis Adapter:** Enables multiple Node.js WebSocket instances to exchange broadcast messages across server nodes via Redis Pub/Sub.
2. **Room-Based Sharding:** Direct users joining `Room X` to dedicated worker nodes based on room ID hashes.
3. **3D State Checkpoints:** Periodically serialize 3D mesh snapshots every 1,000 operations, truncating operation logs to prevent memory exhaustion during long sessions.
