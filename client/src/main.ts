import { CanvasManager } from './canvas/CanvasManager';
import { DrawingRenderer } from './canvas/DrawingRenderer';
import { InputHandler } from './canvas/InputHandler';
import { SocketClient } from './network/SocketClient';
import { DrawingStore } from './state/DrawingStore';
import { Cursors } from './ui/Cursors';
import { LayersPanel } from './ui/LayersPanel';
import { ReplayBar } from './ui/ReplayBar';
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
  private layersPanel: LayersPanel;
  private replayBar: ReplayBar;
  private cursors: Cursors;

  private currentOpId: string | null = null;
  private currentOpPoints: Point[] = [];
  private selectedOpId: string | null = null;
  private selectedOpStartPoints: Point[] = [];

  private roomId: string = 'default';

  // Time-Lapse Replay State
  private isReplaying: boolean = false;
  private replayIndex: number = 0;
  private replayTimer: number | null = null;
  private replaySpeed: number = 1;

  // FPS & Zoom Stats
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private fpsEl: HTMLElement | null = null;
  private zoomEl: HTMLElement | null = null;

  constructor() {
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

    // Layers Panel
    this.layersPanel = new LayersPanel({
      onLayerSelect: () => this.triggerRedraw(),
      onLayerAdd: () => this.triggerRedraw(),
      onLayerToggleVisibility: () => this.triggerRedraw(),
      onLayerToggleLock: () => this.triggerRedraw(),
    });

    // Time-Lapse Replay Bar
    this.replayBar = new ReplayBar({
      onPlay: () => this.startReplay(),
      onPause: () => this.pauseReplay(),
      onScrub: (idx) => this.scrubReplay(idx),
      onSpeedChange: (speed) => (this.replaySpeed = speed),
    });

    // Toolbar Controls
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
      onToggleGrid: () => this.canvasManager.toggleGridMode(),
      onToggleSnap: () => this.canvasManager.toggleSnapToGrid(),
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
      onStrokeMove: (point, prevPoint, shiftKey) => this.handleStrokeMove(point, prevPoint, shiftKey),
      onStrokeEnd: () => this.handleStrokeEnd(),
      onCursorMove: (point) => this.socketClient.emitCursorMove(point),
      onPan: (dx, dy) => this.canvasManager.setPan(dx, dy),
      onZoom: (factor, center) => this.canvasManager.setZoom(this.canvasManager.getZoom() * factor, center),
      onTextPrompt: (point) => this.handleTextPrompt(point),
      onSelectClick: (point) => this.handleSelectClick(point),
    });

    this.canvasManager.setResizeCallback(() => this.triggerRedraw());
    this.store.subscribe(() => {
      this.triggerRedraw();
      this.updateReplayBar();
    });

    this.startFpsLoop();
  }

  private triggerRedraw(): void {
    if (this.isReplaying) {
      const activeOps = this.store
        .getOperations()
        .filter((o) => o.active)
        .sort((a, b) => a.sequence - b.sequence)
        .slice(0, this.replayIndex);
      this.renderer.reconstructCanvas(activeOps, null);
      return;
    }

    // Filter operations by visible layers
    const visibleLayerIds = new Set(
      this.layersPanel
        .getLayers()
        .filter((l) => l.visible)
        .map((l) => l.id)
    );

    const ops = this.store.getOperations().filter((op) => !op.layerId || visibleLayerIds.has(op.layerId));
    this.renderer.reconstructCanvas(ops, this.selectedOpId);
    this.updateStats();
  }

  private handleStrokeStart(point: Point): void {
    const tool = this.toolbar.getTool();
    if (tool === 'select' || tool === 'pan' || tool === 'text') return;

    const color = this.toolbar.getColor();
    const width = this.toolbar.getWidth();
    const layerId = this.layersPanel.getActiveLayerId();

    this.currentOpId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentOpPoints = [point];

    if (tool === 'brush' || tool === 'eraser') {
      this.renderer.renderDot(tool, color, width, point);
    }

    this.socketClient.emitStrokeStart(this.currentOpId, tool, color, width, point);
  }

  private handleStrokeMove(point: Point, prevPoint: Point, shiftKey: boolean): void {
    const tool = this.toolbar.getTool();

    // Drag-to-Move Selected Object
    if (tool === 'select' && this.selectedOpId) {
      const selectedOp = this.store.getOperations().find((o) => o.id === this.selectedOpId);
      if (selectedOp && selectedOp.points) {
        const deltaX = point.x - prevPoint.x;
        const deltaY = point.y - prevPoint.y;
        selectedOp.points.forEach((p) => {
          p.x += deltaX;
          p.y += deltaY;
        });
        this.triggerRedraw();
      }
      return;
    }

    if (!this.currentOpId) return;

    const color = this.toolbar.getColor();
    const width = this.toolbar.getWidth();

    if (tool === 'brush' || tool === 'eraser') {
      this.currentOpPoints.push(point);
      this.renderer.renderSegment(tool, color, width, prevPoint, point);
      this.socketClient.emitStrokePoint(this.currentOpId, point);
    } else {
      // Shape tools with Shift key aspect ratio constraining
      let endPoint = point;
      if (shiftKey && this.currentOpPoints.length > 0) {
        const start = this.currentOpPoints[0];
        const dx = Math.abs(point.x - start.x);
        const dy = Math.abs(point.y - start.y);
        const maxDist = Math.max(dx, dy);

        if (tool === 'rectangle' || tool === 'ellipse') {
          // Constrain 1:1 Aspect Ratio (Square / Circle)
          endPoint = {
            x: start.x + (point.x >= start.x ? maxDist : -maxDist),
            y: start.y + (point.y >= start.y ? maxDist : -maxDist),
          };
        } else if (tool === 'line') {
          // Constrain 45-degree angle increments
          if (dx > dy * 2) endPoint = { x: point.x, y: start.y };
          else if (dy > dx * 2) endPoint = { x: start.x, y: point.y };
          else endPoint = { x: start.x + (point.x >= start.x ? maxDist : -maxDist), y: start.y + (point.y >= start.y ? maxDist : -maxDist) };
        }
      }

      this.currentOpPoints = [this.currentOpPoints[0], endPoint];
      this.triggerRedraw();

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
    this.socketClient.emitStrokeEnd(opId);
  }

  private handleSelectClick(clickPoint: Point): void {
    const ops = this.store
      .getOperations()
      .filter((o) => o.active)
      .sort((a, b) => b.sequence - a.sequence);

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

      const padding = 12;
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

  // --- Time-Lapse Replay Engine ---

  private startReplay(): void {
    const activeOps = this.store.getOperations().filter((o) => o.active);
    if (activeOps.length === 0) return;

    this.isReplaying = true;
    if (this.replayIndex >= activeOps.length) {
      this.replayIndex = 0;
    }

    this.stepReplay();
  }

  private stepReplay(): void {
    const activeOps = this.store.getOperations().filter((o) => o.active);
    if (!this.isReplaying || this.replayIndex >= activeOps.length) {
      this.pauseReplay();
      return;
    }

    this.replayIndex++;
    this.triggerRedraw();
    this.updateReplayBar();

    const interval = Math.max(50, 400 / this.replaySpeed);
    this.replayTimer = window.setTimeout(() => this.stepReplay(), interval);
  }

  private pauseReplay(): void {
    this.isReplaying = false;
    if (this.replayTimer !== null) {
      clearTimeout(this.replayTimer);
      this.replayTimer = null;
    }
    this.replayBar.setPlayingState(false);
  }

  private scrubReplay(index: number): void {
    this.pauseReplay();
    this.isReplaying = true;
    this.replayIndex = index;
    this.triggerRedraw();
    this.updateReplayBar();
  }

  private updateReplayBar(): void {
    const activeOps = this.store.getOperations().filter((o) => o.active);
    if (!this.isReplaying) {
      this.replayIndex = activeOps.length;
    }
    this.replayBar.updateRange(activeOps.length, this.replayIndex);
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
