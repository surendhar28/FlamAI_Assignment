import { CanvasManager } from './CanvasManager';
import { Point } from '../../../shared/protocol';

export interface InputHandlerCallbacks {
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point, prevPoint: Point) => void;
  onStrokeEnd: () => void;
  onCursorMove: (point: Point) => void;
}

export class InputHandler {
  private canvasManager: CanvasManager;
  private callbacks: InputHandlerCallbacks;
  private isDrawing: boolean = false;
  private lastPoint: Point | null = null;

  constructor(canvasManager: CanvasManager, callbacks: InputHandlerCallbacks) {
    this.canvasManager = canvasManager;
    this.callbacks = callbacks;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const canvas = this.canvasManager.getCanvas();

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
  }

  private handlePointerDown = (e: PointerEvent): void => {
    // Only respond to primary mouse click / touch contact
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const canvas = this.canvasManager.getCanvas();
    canvas.setPointerCapture(e.pointerId);

    this.isDrawing = true;
    const normPoint = this.canvasManager.normalizeCoordinates(e.clientX, e.clientY);
    this.lastPoint = normPoint;

    this.callbacks.onStrokeStart(normPoint);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const normPoint = this.canvasManager.normalizeCoordinates(e.clientX, e.clientY);

    // Always trigger cursor presence update callback
    this.callbacks.onCursorMove(normPoint);

    if (!this.isDrawing || !this.lastPoint) return;

    // Trigger stroke move callback with current and previous points
    this.callbacks.onStrokeMove(normPoint, this.lastPoint);
    this.lastPoint = normPoint;
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.lastPoint = null;

    const canvas = this.canvasManager.getCanvas();
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    this.callbacks.onStrokeEnd();
  };

  private handlePointerLeave = (e: PointerEvent): void => {
    // Pointer capture handles active drags out of window; pointerleave handles non-dragging cursor exit
    if (!this.isDrawing) {
      // Could notify cursor left if needed
    }
  };

  public destroy(): void {
    const canvas = this.canvasManager.getCanvas();
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointercancel', this.handlePointerUp);
    canvas.removeEventListener('pointerleave', this.handlePointerLeave);
  }
}
