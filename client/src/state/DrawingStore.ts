import { DrawingOperation, Point, UserPresence } from '../../../shared/protocol';

export type StoreChangeListener = () => void;

export class DrawingStore {
  private operations: DrawingOperation[] = [];
  private operationMap: Map<string, DrawingOperation> = new Map();
  private users: Map<string, UserPresence> = new Map();
  private myUser: UserPresence | null = null;
  private listeners: Set<StoreChangeListener> = new Set();

  public subscribe(listener: StoreChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  // --- Operations ---

  public getOperations(): DrawingOperation[] {
    return this.operations;
  }

  public setOperations(ops: DrawingOperation[]): void {
    this.operations = [...ops];
    this.operationMap.clear();
    this.operations.forEach((op) => this.operationMap.set(op.id, op));
    this.notify();
  }

  public addOperation(op: DrawingOperation): void {
    if (this.operationMap.has(op.id)) {
      // Duplicate operation drop
      return;
    }
    this.operations.push(op);
    this.operationMap.set(op.id, op);
    this.notify();
  }

  public appendPointsToOperation(operationId: string, newPoints: Point[]): void {
    const op = this.operationMap.get(operationId);
    if (op) {
      op.points.push(...newPoints);
      this.notify();
    }
  }

  public setOperationActive(operationId: string, active: boolean): void {
    const op = this.operationMap.get(operationId);
    if (op && op.active !== active) {
      op.active = active;
      this.notify();
    }
  }

  // --- Users & Presence ---

  public getMyUser(): UserPresence | null {
    return this.myUser;
  }

  public setMyUser(user: UserPresence): void {
    this.myUser = user;
    this.users.set(user.id, user);
    this.notify();
  }

  public getUsers(): UserPresence[] {
    return Array.from(this.users.values());
  }

  public setUsers(users: UserPresence[]): void {
    this.users.clear();
    users.forEach((u) => this.users.set(u.id, u));
    if (this.myUser) {
      this.users.set(this.myUser.id, this.myUser);
    }
    this.notify();
  }

  public addUser(user: UserPresence): void {
    this.users.set(user.id, user);
    this.notify();
  }

  public removeUser(userId: string): void {
    this.users.delete(userId);
    this.notify();
  }

  public updateUserCursor(userId: string, cursor: { x: number; y: number }): void {
    const user = this.users.get(userId);
    if (user) {
      user.cursor = cursor;
      this.notify();
    }
  }
}
