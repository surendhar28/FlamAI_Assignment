import { Canvas3DManager } from './Canvas3DManager';
import { DrawingTool, Point3D } from '../../../shared/protocol';

export interface Input3DHandlerCallbacks {
  onStrokeStart: (point: Point3D) => void;
  onStrokeMove: (point: Point3D, prevPoint: Point3D, shiftKey: boolean) => void;
  onStrokeEnd: () => void;
  onCursorMove: (point: Point3D) => void;
  onTextPrompt: (point: Point3D) => void;
  onSelectClick: (point: Point3D) => void;
}

export class Input3DHandler {
  private canvas3DManager: Canvas3DManager;
  private callbacks: Input3DHandlerCallbacks;

  private isDrawing: boolean = false;
  private isNavigating: boolean = false;
  private isSpacePressed: boolean = false;
  private activeToolGetter: () => DrawingTool = () => 'brush';

  private lastPoint: Point3D | null = null;
  private lastScreenPx: { x: number; y: number } | null = null;

  constructor(
    canvas3DManager: Canvas3DManager,
    activeToolGetter: () => DrawingTool,
    callbacks: Input3DHandlerCallbacks
  ) {
    this.canvas3DManager = canvas3DManager;
    this.activeToolGetter = activeToolGetter;
    this.callbacks = callbacks;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const canvas = this.canvas3DManager.getCanvas();

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') this.isSpacePressed = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.isSpacePressed = false;
    });
  }

  private handlePointerDown = (e: PointerEvent): void => {
    const currentTool = this.activeToolGetter();
    const isRightClick = e.button === 2;
    const isOrbitTool = currentTool === 'orbit';

    if (isRightClick || isOrbitTool || this.isSpacePressed) {
      // 3D Navigation mode (Orbit / Pan camera)
      this.isNavigating = true;
      this.lastScreenPx = { x: e.clientX, y: e.clientY };
      const canvas = this.canvas3DManager.getCanvas();
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const point3D = this.canvas3DManager.screenToWorld3D(e.clientX, e.clientY);

    if (currentTool === 'select') {
      this.callbacks.onSelectClick(point3D);
      return;
    }

    if (currentTool === 'text') {
      this.callbacks.onTextPrompt(point3D);
      return;
    }

    const canvas = this.canvas3DManager.getCanvas();
    canvas.setPointerCapture(e.pointerId);

    this.isDrawing = true;
    this.lastPoint = point3D;
    this.callbacks.onStrokeStart(point3D);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.isNavigating && this.lastScreenPx) {
      const dx = e.clientX - this.lastScreenPx.x;
      const dy = e.clientY - this.lastScreenPx.y;
      this.lastScreenPx = { x: e.clientX, y: e.clientY };
      this.canvas3DManager.handleOrbitPan(dx, dy, e.button === 2 || e.shiftKey);
      return;
    }

    const point3D = this.canvas3DManager.screenToWorld3D(e.clientX, e.clientY);
    this.callbacks.onCursorMove(point3D);

    if (!this.isDrawing || !this.lastPoint) return;

    this.callbacks.onStrokeMove(point3D, this.lastPoint, e.shiftKey);
    this.lastPoint = point3D;
  };

  private handlePointerUp = (e: PointerEvent): void => {
    const canvas = this.canvas3DManager.getCanvas();
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (this.isNavigating) {
      this.isNavigating = false;
      this.lastScreenPx = null;
      return;
    }

    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.lastPoint = null;
    this.callbacks.onStrokeEnd();
  };

  public destroy(): void {
    const canvas = this.canvas3DManager.getCanvas();
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointercancel', this.handlePointerUp);
  }
}
