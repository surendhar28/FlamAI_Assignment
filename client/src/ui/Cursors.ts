import { CanvasManager } from '../canvas/CanvasManager';
import { DrawingStore } from '../state/DrawingStore';

export class Cursors {
  private store: DrawingStore;
  private canvasManager: CanvasManager;
  private overlayEl: HTMLElement;
  private cursorElements: Map<string, HTMLElement> = new Map();

  constructor(store: DrawingStore, canvasManager: CanvasManager) {
    this.store = store;
    this.canvasManager = canvasManager;
    this.overlayEl = document.getElementById('cursor-overlay') as HTMLElement;

    this.store.subscribe(() => this.render());
  }

  public render(): void {
    const users = this.store.getUsers();
    const myUser = this.store.getMyUser();
    const activeUserIds = new Set<string>();

    users.forEach((user) => {
      // Don't render cursor for local user
      if (myUser && user.id === myUser.id) return;
      if (!user.cursor) return;

      activeUserIds.add(user.id);
      let cursorEl = this.cursorElements.get(user.id);

      if (!cursorEl) {
        cursorEl = this.createCursorElement(user.name, user.color);
        this.overlayEl.appendChild(cursorEl);
        this.cursorElements.set(user.id, cursorEl);
      }

      // Position remote cursor using denormalized pixel coordinates
      const px = this.canvasManager.denormalizeCoordinates(user.cursor);
      cursorEl.style.transform = `translate3d(${px.x}px, ${px.y}px, 0)`;
    });

    // Cleanup stale cursor elements
    this.cursorElements.forEach((el, id) => {
      if (!activeUserIds.has(id)) {
        el.remove();
        this.cursorElements.delete(id);
      }
    });
  }

  private createCursorElement(userName: string, userColor: string): HTMLElement {
    const cursor = document.createElement('div');
    cursor.className = 'remote-cursor';

    const pointer = document.createElement('div');
    pointer.className = 'remote-cursor-pointer';
    pointer.style.backgroundColor = userColor;

    const label = document.createElement('div');
    label.className = 'remote-cursor-label';
    label.style.backgroundColor = userColor;
    label.textContent = userName;

    cursor.appendChild(pointer);
    cursor.appendChild(label);
    return cursor;
  }
}
