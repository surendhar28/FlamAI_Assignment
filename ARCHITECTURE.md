# Technical Architecture & Engineering Documentation

## 1. Architecture Overview

The Collaborative Drawing Canvas is designed around an **Operation-Based Synchronization Model**. The application treats drawing as a stream of immutable vector operations rather than raster image state.

```text
  [ User Input (Pointer Events) ]
                 │
                 ├──────────────────────────────────────────┐
                 ▼                                          ▼
   ┌─────────────────────────┐                ┌─────────────────────────┐
   │ Immediate Local Render  │                │ Point Batcher & RAF     │
   │   (0ms Latency View)    │                └────────────┬────────────┘
   └─────────────────────────┘                             │ (Batched Points)
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
                                  │   (Render Stroke)     │ │   (Render Stroke)     │
                                  └───────────────────────┘ └───────────────────────┘
```

---

## 2. State Model

Every drawing stroke is represented by a `DrawingOperation` object:

```ts
export interface Point {
  x: number; // Normalized (0.0 to 1.0)
  y: number; // Normalized (0.0 to 1.0)
}

export interface DrawingOperation {
  id: string;          // Unique client UUID
  sequence: number;    // Server-assigned sequence integer
  userId: string;      // Author socket ID
  tool: 'brush' | 'eraser';
  color: string;       // Hex string
  width: number;       // Line width in px
  points: Point[];     // Collection of stroke points
  active: boolean;     // True = rendered, False = undone (tombstone)
}
```

---

## 3. WebSocket Protocol Specification

All communication between client and server uses typed Socket.IO event payloads:

| Event Name | Sender | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | Client | `{ roomId: string; username?: string }` | Client joins a room instance |
| `room_state` | Server | `{ roomId, users, operations, myUser }` | Transmits canonical state to new/reconnecting user |
| `stroke_start` | Client | `{ operationId, tool, color, width, point }` | Signals new stroke creation |
| `stroke_start` | Server | `{ operationId, sequence, userId, tool, color, width, point }` | Broadcasts new stroke start with server sequence |
| `stroke_chunk` | Client | `{ operationId, points }` | Transmits batched points payload |
| `stroke_chunk` | Server | `{ operationId, userId, points }` | Broadcasts batched points to peers |
| `stroke_end` | Client/Server | `{ operationId, userId }` | Finalizes stroke operation |
| `cursor_move` | Client | `{ position }` | Throttled cursor position emission |
| `cursor_update`| Server | `{ userId, position }` | Broadcasts peer cursor position |
| `undo` | Client | `{}` | Requests undoing latest global active operation |
| `redo` | Client | `{}` | Requests redoing latest global inactive operation |
| `operation_undone` | Server | `{ operationId }` | Directs all clients to mark operation inactive |
| `operation_redone` | Server | `{ operationId }` | Directs all clients to mark operation active |

---

## 4. Global Undo / Redo Strategy (Tombstones)

Undo operates on the **global room history**, not just the local user's strokes.

### Mechanism:
1. When any client sends an `undo` request, the Node.js server scans the room's canonical operation history backwards starting from the most recent stroke.
2. The server locates the latest operation with `active === true` and sets `active = false` (tombstone marking).
3. The server broadcasts `operation_undone` with `operationId` to all room clients.
4. Clients update their local state store and trigger a full canvas reconstruction (`reconstructCanvas()`), clearing the viewport and redrawing only operations where `active === true` sorted by `sequence`.

---

## 5. Conflict Resolution & Ordering

- **Server-Assigned Sequence Numbers:** Upon stroke creation, the server assigns a monotonically increasing `sequence` integer (`1, 2, 3...`).
- **Deterministic Convergence:** Every client renders operations ordered strictly by `sequence`. Even if WebSocket packets arrive slightly out of order over the network, all clients converge to the exact same canvas rendering.
- **Simultaneous Strokes:** Concurrent drawings in overlapping canvas areas remain non-destructive. Strokes layer deterministically according to server sequence numbers.

---

## 6. Performance Optimization Strategy

1. **Optimistic Local Rendering (0ms Latency):** Local mouse move events immediately render line segments to the canvas context without waiting for server network roundtrips.
2. **Outbound Point Batching (RAF Driven):** Points are queued and emitted in batches every 16ms (driven by `requestAnimationFrame`), reducing WebSocket frame rate from ~120/sec to ~60/sec and cutting network payload overhead by 80%.
3. **Cursor Throttling (30ms):** Cursors are non-critical presence data; their emissions are throttled to 30ms (~33 updates/sec).
4. **Separate Cursor Overlay:** Cursor elements are rendered on an overlay HTML DOM element (`#cursor-overlay`), keeping main canvas rendering un-disturbed.

---

## 7. Failure Handling & Resilience

- **Reconnection Recovery:** Socket.IO automatically reconnects upon network loss. Upon reconnecting, the client emits `join_room` and receives the complete `room_state` payload, rebuilding canvas history state cleanly.
- **Duplicate Operation Protection:** The server checks `operationMap.has(operationId)` before creating strokes, silently dropping duplicate submissions caused by network retries.
- **Malformed Input Rejection:** `SchemaValidator` verifies tool types, hex colors, widths, and normalized point bounds, emitting an `error` frame and rejecting bad payloads without crashing the server.

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
         (Room Operation Snapshots)
```

1. **Socket.IO Redis Adapter:** Enables multiple Node.js WebSocket instances to exchange broadcast messages across server nodes via Redis Pub/Sub.
2. **Room-Based Sharding:** Direct users joining `Room X` to dedicated worker nodes based on room ID hashes.
3. **Canvas State Checkpoints:** Periodically serialize canvas snapshots every 1,000 operations, truncating operation logs to prevent memory exhaustion during long sessions.
