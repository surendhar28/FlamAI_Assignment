import { io, Socket } from 'socket.io-client';
import {
  CursorMovePayload,
  CursorUpdateBroadcastPayload,
  DrawingTool,
  JoinRoomPayload,
  OperationRedonePayload,
  OperationUndonePayload,
  Point,
  RoomStatePayload,
  StrokeChunkBroadcastPayload,
  StrokeChunkPayload,
  StrokeEndBroadcastPayload,
  StrokeEndPayload,
  StrokeStartBroadcastPayload,
  StrokeStartPayload,
  UserJoinedPayload,
  UserLeftPayload,
} from '../../../shared/protocol';
import { DrawingStore } from '../state/DrawingStore';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface SocketClientCallbacks {
  onStatusChange: (status: ConnectionStatus) => void;
  onRemoteStrokeStart: (payload: StrokeStartBroadcastPayload) => void;
  onRemoteStrokeChunk: (payload: StrokeChunkBroadcastPayload) => void;
  onRemoteStrokeEnd: (payload: StrokeEndBroadcastPayload) => void;
}

export class SocketClient {
  private socket: Socket;
  private store: DrawingStore;
  private callbacks: SocketClientCallbacks;
  private roomId: string;

  // Point Batching Queue
  private pendingPointQueue: { operationId: string; points: Point[] } = {
    operationId: '',
    points: [],
  };
  private rafId: number | null = null;

  // Cursor Throttling
  private lastCursorTime: number = 0;
  private readonly CURSOR_THROTTLE_MS = 30; // Max ~33 updates/sec

  constructor(roomId: string, store: DrawingStore, callbacks: SocketClientCallbacks) {
    this.roomId = roomId;
    this.store = store;
    this.callbacks = callbacks;

    // Connect to backend server
    this.socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.initSocketEvents();
  }

  private initSocketEvents(): void {
    this.socket.on('connect', () => {
      console.log('⚡ Connected to Socket.IO Server:', this.socket.id);
      this.callbacks.onStatusChange('connected');
      this.joinRoom(this.roomId);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Disconnected from server:', reason);
      this.callbacks.onStatusChange('disconnected');
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.callbacks.onStatusChange('reconnecting');
    });

    // Room state catch-up on join/reconnect
    this.socket.on('room_state', (payload: RoomStatePayload) => {
      this.store.setMyUser(payload.myUser);
      this.store.setUsers(payload.users);
      this.store.setOperations(payload.operations);
    });

    // Remote stroke start
    this.socket.on('stroke_start', (payload: StrokeStartBroadcastPayload) => {
      this.store.addOperation({
        id: payload.operationId,
        sequence: payload.sequence,
        userId: payload.userId,
        tool: payload.tool,
        color: payload.color,
        width: payload.width,
        points: [payload.point],
        active: true,
      });
      this.callbacks.onRemoteStrokeStart(payload);
    });

    // Remote stroke chunk
    this.socket.on('stroke_chunk', (payload: StrokeChunkBroadcastPayload) => {
      this.store.appendPointsToOperation(payload.operationId, payload.points);
      this.callbacks.onRemoteStrokeChunk(payload);
    });

    // Remote stroke end
    this.socket.on('stroke_end', (payload: StrokeEndBroadcastPayload) => {
      this.callbacks.onRemoteStrokeEnd(payload);
    });

    // Cursor position update
    this.socket.on('cursor_update', (payload: CursorUpdateBroadcastPayload) => {
      this.store.updateUserCursor(payload.userId, payload.position);
    });

    // Global Undo broadcast
    this.socket.on('operation_undone', (payload: OperationUndonePayload) => {
      this.store.setOperationActive(payload.operationId, false);
    });

    // Global Redo broadcast
    this.socket.on('operation_redone', (payload: OperationRedonePayload) => {
      this.store.setOperationActive(payload.operationId, true);
    });

    // User Presence events
    this.socket.on('user_joined', (payload: UserJoinedPayload) => {
      this.store.addUser(payload.user);
    });

    this.socket.on('user_left', (payload: UserLeftPayload) => {
      this.store.removeUser(payload.userId);
    });
  }

  public joinRoom(roomId: string): void {
    this.roomId = roomId;
    const payload: JoinRoomPayload = { roomId };
    this.socket.emit('join_room', payload);
  }

  // --- Outbound Network Operations ---

  public emitStrokeStart(
    operationId: string,
    tool: DrawingTool,
    color: string,
    width: number,
    point: Point
  ): void {
    const payload: StrokeStartPayload = {
      operationId,
      tool,
      color,
      width,
      point,
    };
    this.socket.emit('stroke_start', payload);

    // Initialize batching queue
    this.pendingPointQueue = { operationId, points: [] };
  }

  /**
   * Outbound Point Batcher driven by requestAnimationFrame (~16ms).
   * Accumulates local points and transmits them in batches.
   */
  public emitStrokePoint(operationId: string, point: Point): void {
    if (this.pendingPointQueue.operationId !== operationId) {
      this.pendingPointQueue = { operationId, points: [] };
    }

    this.pendingPointQueue.points.push(point);

    // Schedule RAF batch flush if not already scheduled
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.flushPointBatch());
    }
  }

  private flushPointBatch(): void {
    this.rafId = null;
    if (!this.pendingPointQueue.operationId || this.pendingPointQueue.points.length === 0) {
      return;
    }

    const payload: StrokeChunkPayload = {
      operationId: this.pendingPointQueue.operationId,
      points: [...this.pendingPointQueue.points],
    };
    this.socket.emit('stroke_chunk', payload);

    // Clear points queue
    this.pendingPointQueue.points = [];
  }

  public emitStrokeEnd(operationId: string): void {
    // Flush any remaining points immediately
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.flushPointBatch();

    const payload: StrokeEndPayload = { operationId };
    this.socket.emit('stroke_end', payload);
  }

  /**
   * Throttled Outbound Cursor Position Update.
   */
  public emitCursorMove(position: Point): void {
    const now = performance.now();
    if (now - this.lastCursorTime >= this.CURSOR_THROTTLE_MS) {
      this.lastCursorTime = now;
      const payload: CursorMovePayload = { position };
      this.socket.emit('cursor_move', payload);
    }
  }

  public emitUndo(): void {
    this.socket.emit('undo');
  }

  public emitRedo(): void {
    this.socket.emit('redo');
  }
}
