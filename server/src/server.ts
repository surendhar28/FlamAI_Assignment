import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './RoomManager';
import { SchemaValidator } from './utils/validation';
import {
  CursorMovePayload,
  JoinRoomPayload,
  StrokeChunkPayload,
  StrokeEndPayload,
  StrokeStartPayload,
} from '../../shared/protocol';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();

// Serve frontend dist assets in production
const clientDistPath = path.join(__dirname, '../../dist/client');
app.use(express.static(clientDistPath));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback to client index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Collaborative Canvas Backend Running.');
    }
  });
});

interface SocketData {
  roomId?: string;
  userId?: string;
}

io.on('connection', (socket: Socket) => {
  const data: SocketData = {};

  socket.on('join_room', (payload: JoinRoomPayload) => {
    if (!payload || !SchemaValidator.isValidId(payload.roomId)) {
      socket.emit('error', { code: 'INVALID_ROOM', message: 'Invalid room ID provided.' });
      return;
    }

    const roomId = payload.roomId.trim();
    const roomState = roomManager.getOrCreateRoom(roomId);
    const userPresence = roomManager.createUserPresence(socket.id, payload.username);

    data.roomId = roomId;
    data.userId = userPresence.id;

    socket.join(roomId);
    roomState.addUser(userPresence);

    // Send initial canonical room state to joined user
    socket.emit('room_state', {
      roomId,
      users: roomState.getUsers(),
      operations: roomState.getOperations(),
      myUser: userPresence,
    });

    // Broadcast user joined notification to room peers
    socket.to(roomId).emit('user_joined', { user: userPresence });
  });

  socket.on('stroke_start', (payload: StrokeStartPayload) => {
    if (!data.roomId || !data.userId) return;
    const room = roomManager.getRoom(data.roomId);
    if (!room) return;

    // Validate payload
    if (
      !payload ||
      !SchemaValidator.isValidId(payload.operationId) ||
      !SchemaValidator.isValidTool(payload.tool) ||
      !SchemaValidator.isValidColor(payload.color) ||
      !SchemaValidator.isValidWidth(payload.width) ||
      !SchemaValidator.isValidPoint(payload.point)
    ) {
      socket.emit('error', { code: 'INVALID_STROKE_START', message: 'Malformed stroke start payload.' });
      return;
    }

    const op = room.startOperation(
      payload.operationId,
      data.userId,
      payload.tool,
      payload.color,
      payload.width,
      payload.point
    );

    if (op) {
      // Broadcast stroke start to peers
      socket.to(data.roomId).emit('stroke_start', {
        ...payload,
        userId: data.userId,
        sequence: op.sequence,
      });
    }
  });

  socket.on('stroke_chunk', (payload: StrokeChunkPayload) => {
    if (!data.roomId || !data.userId) return;
    const room = roomManager.getRoom(data.roomId);
    if (!room) return;

    if (
      !payload ||
      !SchemaValidator.isValidId(payload.operationId) ||
      !Array.isArray(payload.points) ||
      payload.points.length === 0 ||
      !payload.points.every(SchemaValidator.isValidPoint)
    ) {
      return; // Drop malformed chunk safely
    }

    const success = room.appendPoints(payload.operationId, payload.points);
    if (success) {
      socket.to(data.roomId).emit('stroke_chunk', {
        operationId: payload.operationId,
        userId: data.userId,
        points: payload.points,
      });
    }
  });

  socket.on('stroke_end', (payload: StrokeEndPayload) => {
    if (!data.roomId || !data.userId) return;
    if (!payload || !SchemaValidator.isValidId(payload.operationId)) return;

    socket.to(data.roomId).emit('stroke_end', {
      operationId: payload.operationId,
      userId: data.userId,
    });
  });

  socket.on('cursor_move', (payload: CursorMovePayload) => {
    if (!data.roomId || !data.userId) return;
    const room = roomManager.getRoom(data.roomId);
    if (!room) return;

    if (!payload || !SchemaValidator.isValidPoint(payload.position)) return;

    room.updateUserCursor(data.userId, payload.position);
    socket.to(data.roomId).emit('cursor_update', {
      userId: data.userId,
      position: payload.position,
    });
  });

  socket.on('undo', () => {
    if (!data.roomId) return;
    const room = roomManager.getRoom(data.roomId);
    if (!room) return;

    const undoneOpId = room.undoLastActiveOperation();
    if (undoneOpId) {
      // Broadcast operation undone to ALL clients in room (including sender)
      io.in(data.roomId).emit('operation_undone', { operationId: undoneOpId });
    }
  });

  socket.on('redo', () => {
    if (!data.roomId) return;
    const room = roomManager.getRoom(data.roomId);
    if (!room) return;

    const redoneOpId = room.redoLastInactiveOperation();
    if (redoneOpId) {
      // Broadcast operation redone to ALL clients in room (including sender)
      io.in(data.roomId).emit('operation_redone', { operationId: redoneOpId });
    }
  });

  socket.on('disconnect', () => {
    if (data.roomId && data.userId) {
      roomManager.removeUserFromRoom(data.roomId, data.userId);
      socket.to(data.roomId).emit('user_left', { userId: data.userId });
    }
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Collaborative Canvas Server running on http://localhost:${PORT}`);
});
