import { CanvasManager } from './CanvasManager';
import { DrawingTool, Point } from '../../../shared/protocol';

export interface InputHandlerCallbacks {
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point, prevPoint: Point, shiftKey: boolean) => void;
  onStrokeEnd: () => void;
  onCursorMove: (point: Point) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  onZoom: (deltaZoom: number, centerPx: { x: number; y: number }) => void;
  onTextPrompt: (point: Point) => void;
  onSelectClick: (point: Point) => void;
}

export class InputHandler {
  private canvasManager: CanvasManager;
  private callbacks: InputHandlerCallbacks;

  private isDrawing: boolean = false;
  private isPanning: boolean = false;
  private isSpacePressed: boolean = false;
  private activeToolGetter: () => DrawingTool = () => 'brush';

  private lastPoint: Point | null = null;
  private lastScreenPx: { x: number; y: number } | null = null;

  constructor(
    canvasManager: CanvasManager,
    activeToolGetter: () => DrawingTool,
    callbacks: InputHandlerCallbacks
  ) {
    this.canvasManager = canvasManager;
    this.activeToolGetter = activeToolGetter;
    this.callbacks = callbacks;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const canvas = this.canvasManager.getCanvas();

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') this.isSpacePressed = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.isSpacePressed = false;
    });
  }

  private handlePointerDown = (e: PointerEvent): void => {
    const currentTool = this.activeToolGetter();
    const isMiddleClick = e.button === 1;
    const isPanTool = (currentTool as string) === 'pan';

    if (isMiddleClick || isPanTool || this.isSpacePressed) {
      this.isPanning = true;
      this.lastScreenPx = { x: e.clientX, y: e.clientY };
      const canvas = this.canvasManager.getCanvas();
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0 && e.pointerType === 'mouse') return;

    if ((currentTool as string) === 'select') {
      const normPoint = this.canvasManager.normalizeCoordinates(e.clientX, e.clientY);
      this.callbacks.onSelectClick(normPoint);
      return;
    }

    if ((currentTool as string) === 'text') {
      const normPoint = this.canvasManager.normalizeCoordinates(e.clientX, e.clientY);
      this.callbacks.onTextPrompt(normPoint);
      return;
    }

    const canvas = this.canvasManager.getCanvas();
    canvas.setPointerCapture(e.pointerId);

    this.isDrawing = true;
    const normPoint = this.canvasManager.normalizeCoordinates(e.clientX, e.clientY);
    this.lastPoint = normPoint;

    this.callbacks.onStrokeStart(normPoint);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.isPanning && this.lastScreenPx) {
      const dx = e.clientX - this.lastScreenPx.x;
      const dy = e.clientY - this.lastScreenPx.y;
      this.lastScreenPx = { x: e.clientX, y: e.clientY };
      this.callbacks.onPan(dx, dy);
      return;
    }

    const normPoint = this.canvasManager.normalizeCoordinates(e.clientX, e.clientY);
    this.callbacks.onCursorMove(normPoint);

    if (!this.isDrawing || !this.lastPoint) return;

    this.callbacks.onStrokeMove(normPoint, this.lastPoint, e.shiftKey);
    this.lastPoint = normPoint;
  };

  private handlePointerUp = (e: PointerEvent): void => {
    const canvas = this.canvasManager.getCanvas();
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (this.isPanning) {
      this.isPanning = false;
      this.lastScreenPx = null;
      return;
    }

    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.lastPoint = null;
    this.callbacks.onStrokeEnd();
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.canvasManager.getCanvas().getBoundingClientRect();
    const center = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    this.callbacks.onZoom(zoomFactor, center);
  };

  public destroy(): void {
    const canvas = this.canvasManager.getCanvas();
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointercancel', this.handlePointerUp);
    canvas.removeEventListener('wheel', this.handleWheel);
  }
}
