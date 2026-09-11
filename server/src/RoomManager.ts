import { DrawingState } from './DrawingState';
import { UserPresence } from '../../shared/protocol';

const USER_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export class RoomManager {
  private rooms: Map<string, DrawingState> = new Map();

  public getOrCreateRoom(roomId: string): DrawingState {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new DrawingState(roomId);
      this.rooms.set(roomId, room);
    }
    return room;
  }

  public getRoom(roomId: string): DrawingState | undefined {
    return this.rooms.get(roomId);
  }

  public createUserPresence(socketId: string, customName?: string): UserPresence {
    // Pick deterministic color based on socket ID string hash
    let hash = 0;
    for (let i = 0; i < socketId.length; i++) {
      hash = socketId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % USER_COLORS.length;

    const shortId = socketId.substring(0, 5);
    return {
      id: socketId,
      name: customName && customName.trim().length > 0 ? customName.trim() : `User-${shortId}`,
      color: USER_COLORS[colorIndex],
    };
  }

  public removeUserFromRoom(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.removeUser(userId);
    }
  }
}
