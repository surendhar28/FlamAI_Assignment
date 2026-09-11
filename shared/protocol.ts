/**
 * Shared TypeScript protocol definitions for Real-Time Collaborative 3D Spatial Canvas.
 * Supports 3D spatial points, 3D mesh geometries, camera angles, and presence tracking.
 */

export type DrawingTool =
  | 'brush'
  | 'eraser'
  | 'line'
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'text'
  | 'select'
  | 'orbit';

export interface Point3D {
  /** Spatial X-coordinate in 3D world space */
  x: number;
  /** Spatial Y-coordinate in 3D world space */
  y: number;
  /** Spatial Z-coordinate in 3D world space */
  z: number;
}

// Backward compatibility alias for Point
export type Point = Point3D;

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface DrawingOperation {
  /** Unique client-generated UUID for the stroke/mesh */
  id: string;
  /** Monotonically increasing server-assigned sequence number */
  sequence: number;
  /** Author user ID */
  userId: string;
  /** Active 3D tool type */
  tool: DrawingTool;
  /** Hex stroke/material color */
  color: string;
  /** Line/mesh size width in 3D world units */
  width: number;
  /** Ordered collection of 3D spatial points */
  points: Point3D[];
  /** Optional text content for 3D text annotations */
  text?: string;
  /** Target layer ID */
  layerId?: string;
  /** Active status flag for global tombstone undo/redo support */
  active: boolean;
}

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor?: Point3D;
}

// Socket.IO Payload Interfaces

export interface JoinRoomPayload {
  roomId: string;
  username?: string;
}

export interface StrokeStartPayload {
  operationId: string;
  tool: DrawingTool;
  color: string;
  width: number;
  point: Point3D;
  text?: string;
  layerId?: string;
}

export interface StrokeStartBroadcastPayload extends StrokeStartPayload {
  userId: string;
  sequence: number;
}

export interface StrokeChunkPayload {
  operationId: string;
  points: Point3D[];
}

export interface StrokeChunkBroadcastPayload extends StrokeChunkPayload {
  userId: string;
}

export interface StrokeEndPayload {
  operationId: string;
}

export interface StrokeEndBroadcastPayload extends StrokeEndPayload {
  userId: string;
}

export interface OperationTransformPayload {
  operationId: string;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

export interface OperationTransformBroadcastPayload extends OperationTransformPayload {
  userId: string;
}

export interface CursorMovePayload {
  position: Point3D;
}

export interface CursorUpdateBroadcastPayload {
  userId: string;
  position: Point3D;
}

export interface RoomStatePayload {
  roomId: string;
  users: UserPresence[];
  operations: DrawingOperation[];
  layers?: CanvasLayer[];
  myUser: UserPresence;
}

export interface OperationUndonePayload {
  operationId: string;
}

export interface OperationRedonePayload {
  operationId: string;
}

export interface UserJoinedPayload {
  user: UserPresence;
}

export interface UserLeftPayload {
  userId: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
