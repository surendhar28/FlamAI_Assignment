import { CanvasManager } from './canvas/CanvasManager';
import { DrawingRenderer } from './canvas/DrawingRenderer';
import { InputHandler } from './canvas/InputHandler';
import { SocketClient } from './network/SocketClient';
import { DrawingStore } from './state/DrawingStore';
import { Cursors } from './ui/Cursors';
import { StatusIndicator } from './ui/StatusIndicator';
import { Toolbar } from './ui/Toolbar';
import { UserList } from './ui/UserList';
import { Point } from '../../shared/protocol';

class App {
  private canvasManager: CanvasManager;
  private renderer: DrawingRenderer;
  private inputHandler: InputHandler;
  private toolbar: Toolbar;
  private store: DrawingStore;
  private socketClient: SocketClient;
  private statusIndicator: StatusIndicator;
  private userList: UserList;
  private cursors: Cursors;

  private currentOpId: string | null = null;
  private roomId: string = 'default';

  // FPS Counter Stats
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private fpsEl: HTMLElement | null = null;

  constructor() {
    // Parse room ID from URL query parameters (e.g. /?room=demo123)
    const urlParams = new URLSearchParams(window.location.search);
    this.roomId = urlParams.get('room')?.trim() || 'default';
    this.updateRoomBadge(this.roomId);

    // Core Canvas & State
    this.store = new DrawingStore();
    this.canvasManager = new CanvasManager('drawing-canvas', 'canvas-viewport');
    this.renderer = new DrawingRenderer(this.canvasManager);

    // UI Modules
    this.statusIndicator = new StatusIndicator();
    this.userList = new UserList(this.store);
    this.cursors = new Cursors(this.store, this.canvasManager);
    this.fpsEl = document.getElementById('stat-fps');

    // UI Toolbar
    this.toolbar = new Toolbar({
      onToolChange: () => {},
      onColorChange: () => {},
      onWidthChange: () => {},
      onUndo: () => this.socketClient.emitUndo(),
      onRedo: () => this.socketClient.emitRedo(),
    });

    // Network Client
    this.socketClient = new SocketClient(this.roomId, this.store, {
      onStatusChange: (status) => this.statusIndicator.setStatus(status),
      onRemoteStrokeStart: () => {},
      onRemoteStrokeChunk: () => {},
      onRemoteStrokeEnd: () => {},
    });

    // Pointer Input Handler
    this.inputHandler = new InputHandler(this.canvasManager, {
      onStrokeStart: (point) => this.handleStrokeStart(point),
      onStrokeMove: (point, prevPoint) => this.handleStrokeMove(point, prevPoint),
      onStrokeEnd: () => this.handleStrokeEnd(),
      onCursorMove: (point) => this.socketClient.emitCursorMove(point),
    });

    // Subscribe store updates to reconstruct canvas
    this.canvasManager.setResizeCallback(() => {
      this.renderer.reconstructCanvas(this.store.getOperations());
    });

    this.store.subscribe(() => {
      this.renderer.reconstructCanvas(this.store.getOperations());
      this.updateStats();
    });

    this.startFpsLoop();
  }

  private handleStrokeStart(point: Point): void {
    const tool = this.toolbar.getTool();
    const color = this.toolbar.getColor();
    const width = this.toolbar.getWidth();

    this.currentOpId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Immediate 0ms local render
    this.renderer.renderDot(tool, color, width, point);

    // Outbound network stroke start
    this.socketClient.emitStrokeStart(this.currentOpId, tool, color, width, point);
  }

  private handleStrokeMove(point: Point, prevPoint: Point): void {
    if (!this.currentOpId) return;

    const tool = this.toolbar.getTool();
    const color = this.toolbar.getColor();
    const width = this.toolbar.getWidth();

    // Immediate 60 FPS local segment render
    this.renderer.renderSegment(tool, color, width, prevPoint, point);

    // Enqueue point to outbound RAF batcher
    this.socketClient.emitStrokePoint(this.currentOpId, point);
  }

  private handleStrokeEnd(): void {
    if (!this.currentOpId) return;

    this.socketClient.emitStrokeEnd(this.currentOpId);
    this.currentOpId = null;
  }

  private updateRoomBadge(roomId: string): void {
    const badge = document.getElementById('room-badge');
    if (badge) {
      badge.textContent = `Room: ${roomId}`;
    }
  }

  private updateStats(): void {
    const opsEl = document.getElementById('stat-ops');
    if (opsEl) {
      const activeCount = this.store.getOperations().filter((o) => o.active).length;
      opsEl.textContent = activeCount.toString();
    }
  }

  private startFpsLoop(): void {
    const calcFps = () => {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsTime >= 1000) {
        if (this.fpsEl) {
          this.fpsEl.textContent = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime)).toString();
        }
        this.frameCount = 0;
        this.lastFpsTime = now;
      }
      requestAnimationFrame(calcFps);
    };
    requestAnimationFrame(calcFps);
  }
}

// Bootstrap application on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
