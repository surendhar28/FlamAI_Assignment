import { DrawingOperation, DrawingTool, Point, UserPresence } from '../../shared/protocol';

export class DrawingState {
  private roomId: string;
  private operations: DrawingOperation[] = [];
  private operationMap: Map<string, DrawingOperation> = new Map();
  private users: Map<string, UserPresence> = new Map();
  private sequenceCounter: number = 0;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public getOperations(): DrawingOperation[] {
    return this.operations;
  }

  public getUsers(): UserPresence[] {
    return Array.from(this.users.values());
  }

  public addUser(user: UserPresence): void {
    this.users.set(user.id, user);
  }

  public removeUser(userId: string): boolean {
    return this.users.delete(userId);
  }

  public updateUserCursor(userId: string, cursor: Point): void {
    const user = this.users.get(userId);
    if (user) {
      user.cursor = cursor;
    }
  }

  /**
   * Starts a new operation in the canonical room history.
   * Assigns a server-authoritative sequence number.
   */
  public startOperation(
    operationId: string,
    userId: string,
    tool: DrawingTool,
    color: string,
    width: number,
    initialPoint: Point
  ): DrawingOperation | null {
    // Duplicate operation protection
    if (this.operationMap.has(operationId)) {
      return null;
    }

    this.sequenceCounter++;
    const operation: DrawingOperation = {
      id: operationId,
      sequence: this.sequenceCounter,
      userId,
      tool,
      color,
      width,
      points: [initialPoint],
      active: true,
    };

    this.operations.push(operation);
    this.operationMap.set(operationId, operation);
    return operation;
  }

  /**
   * Appends batched points to an active operation.
   */
  public appendPoints(operationId: string, points: Point[]): boolean {
    const operation = this.operationMap.get(operationId);
    if (!operation) return false;

    operation.points.push(...points);
    return true;
  }

  /**
   * Global Undo Engine:
   * Scans canonical history backwards for the latest operation with active === true,
   * sets active = false (tombstone), and returns the undone operation ID.
   */
  public undoLastActiveOperation(): string | null {
    for (let i = this.operations.length - 1; i >= 0; i--) {
      if (this.operations[i].active) {
        this.operations[i].active = false;
        return this.operations[i].id;
      }
    }
    return null;
  }

  /**
   * Global Redo Engine:
   * Scans canonical history forward for the latest operation with active === false,
   * sets active = true, and returns the redone operation ID.
   */
  public redoLastInactiveOperation(): string | null {
    for (let i = this.operations.length - 1; i >= 0; i--) {
      if (!this.operations[i].active) {
        this.operations[i].active = true;
        return this.operations[i].id;
      }
    }
    return null;
  }
}
