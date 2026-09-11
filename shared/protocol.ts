/**
 * Shared TypeScript protocol definitions for Collaborative Drawing Canvas.
 * Elevated with multi-layer support, grid snapping, real-time object transformation, and time-lapse replay.
 */

export type DrawingTool =
  | 'brush'
  | 'eraser'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'select'
  | 'pan';

export interface Point {
  /** Normalized x-coordinate relative to canvas width (0.0 to 1.0) */
  x: number;
  /** Normalized y-coordinate relative to canvas height (0.0 to 1.0) */
  y: number;
}

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface DrawingOperation {
  /** Unique client-generated UUID for the stroke */
  id: string;
  /** Monotonically increasing server-assigned sequence number */
  sequence: number;
  /** Author user ID */
  userId: string;
  /** Active tool type */
  tool: DrawingTool;
  /** Hex stroke color */
  color: string;
  /** Stroke line width in CSS pixels */
  width: number;
  /** Ordered collection of normalized stroke points */
  points: Point[];
  /** Optional text content for text annotations */
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
  cursor?: Point;
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
  point: Point;
  text?: string;
  layerId?: string;
}

export interface StrokeStartBroadcastPayload extends StrokeStartPayload {
  userId: string;
  sequence: number;
}

export interface StrokeChunkPayload {
  operationId: string;
  points: Point[];
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
}

export interface OperationTransformBroadcastPayload extends OperationTransformPayload {
  userId: string;
}

export interface CursorMovePayload {
  position: Point;
}

export interface CursorUpdateBroadcastPayload {
  userId: string;
  position: Point;
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
