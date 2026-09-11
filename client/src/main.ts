import { CanvasManager } from './canvas/CanvasManager';
import { DrawingRenderer } from './canvas/DrawingRenderer';
import { InputHandler } from './canvas/InputHandler';
import { SocketClient } from './network/SocketClient';
import { DrawingStore } from './state/DrawingStore';
import { Cursors } from './ui/Cursors';
import { StatusIndicator } from './ui/StatusIndicator';
import { Toolbar } from './ui/Toolbar';
import { UserList } from './ui/UserList';
import { CanvasExporter } from './utils/Exporter';
import { DrawingOperation, Point } from '../../shared/protocol';

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
  private currentOpPoints: Point[] = [];
  private selectedOpId: string | null = null;
  private roomId: string = 'default';

  // FPS & Zoom Stats
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private fpsEl: HTMLElement | null = null;
  private zoomEl: HTMLElement | null = null;

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
    this.zoomEl = document.getElementById('stat-zoom');

    // UI Toolbar
    this.toolbar = new Toolbar({
      onToolChange: () => {
        this.selectedOpId = null;
        this.triggerRedraw();
      },
      onColorChange: () => {},
      onWidthChange: () => {},
      onUndo: () => this.socketClient.emitUndo(),
      onRedo: () => this.socketClient.emitRedo(),
      onZoomIn: () => this.canvasManager.setZoom(this.canvasManager.getZoom() * 1.2),
      onZoomOut: () => this.canvasManager.setZoom(this.canvasManager.getZoom() / 1.2),
      onZoomReset: () => this.canvasManager.resetCamera(),
      onExportPNG: () => CanvasExporter.exportToPNG(this.canvasManager.getCanvas(), `drawing-${this.roomId}.png`),
      onExportSVG: () =>
        CanvasExporter.exportToSVG(
          this.store.getOperations(),
          this.canvasManager.getCSSWidth(),
          this.canvasManager.getCSSHeight(),
          `drawing-${this.roomId}.svg`
        ),
    });

    // Network Client
    this.socketClient = new SocketClient(this.roomId, this.store, {
      onStatusChange: (status) => this.statusIndicator.setStatus(status),
      onRemoteStrokeStart: () => {},
      onRemoteStrokeChunk: () => {},
      onRemoteStrokeEnd: () => {},
    });

    // Pointer Input Handler
    this.inputHandler = new InputHandler(this.canvasManager, () => this.toolbar.getTool(), {
      onStrokeStart: (point) => this.handleStrokeStart(point),
      onStrokeMove: (point, prevPoint) => this.handleStrokeMove(point, prevPoint),
      onStrokeEnd: () => this.handleStrokeEnd(),
      onCursorMove: (point) => this.socketClient.emitCursorMove(point),
      onPan: (dx, dy) => this.canvasManager.setPan(dx, dy),
      onZoom: (factor, center) => this.canvasManager.setZoom(this.canvasManager.getZoom() * factor, center),
      onTextPrompt: (point) => this.handleTextPrompt(point),
      onSelectClick: (point) => this.handleSelectClick(point),
    });

    // Redraw loop & subscription
    this.canvasManager.setResizeCallback(() => this.triggerRedraw());
    this.store.subscribe(() => this.triggerRedraw());

    this.startFpsLoop();
  }

  private triggerRedraw(): void {
    this.renderer.reconstructCanvas(this.store.getOperations(), this.selectedOpId);
    this.updateStats();
  }

  private handleStrokeStart(point: Point): void {
    const tool = this.toolbar.getTool();
    if (tool === 'select' || tool === 'pan' || tool === 'text') return;

    const color = this.toolbar.getColor();
    const width = this.toolbar.getWidth();

    this.currentOpId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentOpPoints = [point];

    if (tool === 'brush' || tool === 'eraser') {
      this.renderer.renderDot(tool, color, width, point);
    }

    this.socketClient.emitStrokeStart(this.currentOpId, tool, color, width, point);
  }

  private handleStrokeMove(point: Point, prevPoint: Point): void {
    if (!this.currentOpId) return;

    const tool = this.toolbar.getTool();
    const color = this.toolbar.getColor();
    const width = this.toolbar.getWidth();

    if (tool === 'brush' || tool === 'eraser') {
      this.currentOpPoints.push(point);
      this.renderer.renderSegment(tool, color, width, prevPoint, point);
      this.socketClient.emitStrokePoint(this.currentOpId, point);
    } else {
      // Shape tools (line, rectangle, ellipse): Live Ghosting Preview
      this.currentOpPoints = [this.currentOpPoints[0], point];
      this.triggerRedraw();

      // Render live preview shape overlay
      const previewOp: DrawingOperation = {
        id: this.currentOpId,
        sequence: 999999,
        userId: 'local',
        tool,
        color,
        width,
        points: this.currentOpPoints,
        active: true,
      };
      this.renderer.renderOperation(previewOp);
    }
  }

  private handleStrokeEnd(): void {
    if (!this.currentOpId) return;

    const tool = this.toolbar.getTool();
    if (tool !== 'brush' && tool !== 'eraser') {
      // For shape tools, send the final end point chunk
      if (this.currentOpPoints.length >= 2) {
        this.socketClient.emitStrokePoint(this.currentOpId, this.currentOpPoints[1]);
      }
    }

    this.socketClient.emitStrokeEnd(this.currentOpId);
    this.currentOpId = null;
    this.currentOpPoints = [];
  }

  private handleTextPrompt(point: Point): void {
    const text = prompt('Enter Text Annotation:');
    if (!text || text.trim() === '') return;

    const tool = 'text';
    const color = this.toolbar.getColor();
    const width = this.toolbar.getWidth();
    const opId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    this.socketClient.emitStrokeStart(opId, tool, color, width, point);
    // Send text payload chunk
    this.socketClient.emitStrokeEnd(opId);
  }

  private handleSelectClick(clickPoint: Point): void {
    const ops = this.store
      .getOperations()
      .filter((o) => o.active)
      .sort((a, b) => b.sequence - a.sequence); // Topmost first

    const cssW = this.canvasManager.getCSSWidth();
    const cssH = this.canvasManager.getCSSHeight();
    const clickPx = { x: clickPoint.x * cssW, y: clickPoint.y * cssH };

    let foundOp: DrawingOperation | null = null;

    for (const op of ops) {
      if (!op.points || op.points.length === 0) continue;
      const pxPoints = op.points.map((p) => ({ x: p.x * cssW, y: p.y * cssH }));

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pxPoints.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });

      const padding = 10;
      if (
        clickPx.x >= minX - padding &&
        clickPx.x <= maxX + padding &&
        clickPx.y >= minY - padding &&
        clickPx.y <= maxY + padding
      ) {
        foundOp = op;
        break;
      }
    }

    this.selectedOpId = foundOp ? foundOp.id : null;
    this.triggerRedraw();
  }

  private updateRoomBadge(roomId: string): void {
    const badge = document.getElementById('room-badge');
    if (badge) badge.textContent = `Room: ${roomId}`;
  }

  private updateStats(): void {
    const opsEl = document.getElementById('stat-ops');
    if (opsEl) {
      const activeCount = this.store.getOperations().filter((o) => o.active).length;
      opsEl.textContent = activeCount.toString();
    }
    if (this.zoomEl) {
      this.zoomEl.textContent = `${Math.round(this.canvasManager.getZoom() * 100)}%`;
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
