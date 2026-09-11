import { Canvas3DManager } from './canvas/Canvas3DManager';
import { Drawing3DRenderer } from './canvas/Drawing3DRenderer';
import { Input3DHandler } from './canvas/Input3DHandler';
import { SocketClient } from './network/SocketClient';
import { DrawingStore } from './state/DrawingStore';
import { Cursors3D } from './ui/Cursors3D';
import { LayersPanel } from './ui/LayersPanel';
import { StatusIndicator } from './ui/StatusIndicator';
import { Toolbar } from './ui/Toolbar';
import { UserList } from './ui/UserList';
import { Exporter3D } from './utils/Exporter3D';
import { DrawingOperation, Point3D } from '../../shared/protocol';

class App {
  private canvas3DManager: Canvas3DManager;
  private renderer3D: Drawing3DRenderer;
  private input3DHandler: Input3DHandler;
  private toolbar: Toolbar;
  private store: DrawingStore;
  private socketClient: SocketClient;
  private statusIndicator: StatusIndicator;
  private userList: UserList;
  private layersPanel: LayersPanel;
  private cursors3D: Cursors3D;

  private currentOpId: string | null = null;
  private currentOpPoints: Point3D[] = [];
  private selectedOpId: string | null = null;

  private roomId: string = 'default';

  // Stats Elements
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private fpsEl: HTMLElement | null = null;
  private viewEl: HTMLElement | null = null;

  constructor() {
    const urlParams = new URLSearchParams(window.location.search);
    this.roomId = urlParams.get('room')?.trim() || 'default';
    this.updateRoomBadge(this.roomId);

    // Core 3D Viewport & State Engine
    this.store = new DrawingStore();
    this.canvas3DManager = new Canvas3DManager('drawing-canvas', 'canvas-viewport');
    this.renderer3D = new Drawing3DRenderer(this.canvas3DManager);

    // UI & 3D Presence Modules
    this.statusIndicator = new StatusIndicator();
    this.userList = new UserList(this.store);
    this.cursors3D = new Cursors3D(this.store, this.canvas3DManager);
    this.fpsEl = document.getElementById('stat-fps');
    this.viewEl = document.getElementById('stat-zoom');

    // Layers Panel
    this.layersPanel = new LayersPanel({
      onLayerSelect: () => this.triggerRedraw(),
      onLayerAdd: () => this.triggerRedraw(),
      onLayerToggleVisibility: () => this.triggerRedraw(),
      onLayerToggleLock: () => this.triggerRedraw(),
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
      onViewPresetChange: (preset) => {
        this.canvas3DManager.setViewPreset(preset);
        if (this.viewEl) this.viewEl.textContent = preset.toUpperCase();
      },
      onExportOBJ: () => Exporter3D.exportToOBJ(this.store.getOperations(), `spatial-model-${this.roomId}.obj`),
      onExportPNG: () => Exporter3D.exportToPNG(this.canvas3DManager.getRenderer(), `spatial-view-${this.roomId}.png`),
    });

    // Network Socket.IO Client
    this.socketClient = new SocketClient(this.roomId, this.store, {
      onStatusChange: (status) => this.statusIndicator.setStatus(status),
      onRemoteStrokeStart: () => {},
      onRemoteStrokeChunk: () => {},
      onRemoteStrokeEnd: () => {},
    });

    // 3D Pointer Raycasting Input Handler
    this.input3DHandler = new Input3DHandler(this.canvas3DManager, () => this.toolbar.getTool(), {
      onStrokeStart: (point) => this.handleStrokeStart(point),
      onStrokeMove: (point, prevPoint, shiftKey) => this.handleStrokeMove(point, prevPoint, shiftKey),
      onStrokeEnd: () => this.handleStrokeEnd(),
      onCursorMove: (point) => this.socketClient.emitCursorMove(point),
      onTextPrompt: (point) => this.handleTextPrompt(point),
      onSelectClick: (point) => this.handleSelectClick(point),
    });

    this.canvas3DManager.setResizeCallback(() => this.triggerRedraw());
    this.store.subscribe(() => this.triggerRedraw());

    this.startFpsLoop();
  }

  private triggerRedraw(): void {
    const visibleLayerIds = new Set(
      this.layersPanel
        .getLayers()
        .filter((l) => l.visible)
        .map((l) => l.id)
    );

    const ops = this.store.getOperations().filter((op) => !op.layerId || visibleLayerIds.has(op.layerId));
    this.renderer3D.reconstruct3DScene(ops, this.selectedOpId);
    this.updateStats();
  }

  private handleStrokeStart(point: Point3D): void {
    const tool = this.toolbar.getTool();
    if (tool === 'select' || tool === 'orbit' || tool === 'text') return;

    const color = this.toolbar.getColor();
    const width = this.toolbar.getWidth();
    const layerId = this.layersPanel.getActiveLayerId();

    this.currentOpId = `op3d_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentOpPoints = [point];

    this.socketClient.emitStrokeStart(this.currentOpId, tool, color, width, point);
  }

  private handleStrokeMove(point: Point3D, prevPoint: Point3D, shiftKey: boolean): void {
    if (!this.currentOpId) return;

    const tool = this.toolbar.getTool();
    const color = this.toolbar.getColor();
    const width = this.toolbar.getWidth();

    if (tool === 'brush' || tool === 'eraser') {
      this.currentOpPoints.push(point);
      this.socketClient.emitStrokePoint(this.currentOpId, point);

      // Render 3D live stroke
      const activeOp: DrawingOperation = {
        id: this.currentOpId,
        sequence: 999999,
        userId: 'local',
        tool,
        color,
        width,
        points: this.currentOpPoints,
        active: true,
      };
      this.renderer3D.renderOperation(activeOp);
    } else {
      // 3D Mesh Primitives (box, sphere, cylinder, line)
      this.currentOpPoints = [this.currentOpPoints[0], point];
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
      this.renderer3D.renderOperation(previewOp);
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

  private handleTextPrompt(point: Point3D): void {
    const text = prompt('Enter 3D Text Annotation:');
    if (!text || text.trim() === '') return;

    const tool = 'text';
    const color = this.toolbar.getColor();
    const width = this.toolbar.getWidth();
    const opId = `op3d_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    this.socketClient.emitStrokeStart(opId, tool, color, width, point);
    this.socketClient.emitStrokeEnd(opId);
  }

  private handleSelectClick(clickPoint: Point3D): void {
    const ops = this.store
      .getOperations()
      .filter((o) => o.active)
      .sort((a, b) => b.sequence - a.sequence);

    let foundOp: DrawingOperation | null = null;

    for (const op of ops) {
      if (!op.points || op.points.length === 0) continue;
      const p = op.points[0];
      const dist = Math.hypot(clickPoint.x - p.x, clickPoint.z - p.z);
      if (dist < 3.0) {
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
