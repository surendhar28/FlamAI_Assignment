import { Point } from '../../../shared/protocol';

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;

  // Camera Transformation Matrix State
  private zoom: number = 1.0;
  private panX: number = 0;
  private panY: number = 0;

  private onResizeCallback?: () => void;

  constructor(canvasId: string, containerId: string) {
    const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement | null;
    const containerEl = document.getElementById(containerId);

    if (!canvasEl || !containerEl) {
      throw new Error(`CanvasManager: Missing #${canvasId} or #${containerId} elements in DOM.`);
    }

    this.canvas = canvasEl;
    this.container = containerEl;

    const context = this.canvas.getContext('2d', { willReadFrequently: false });
    if (!context) {
      throw new Error('CanvasManager: Failed to get 2D rendering context.');
    }
    this.ctx = context;

    this.initResizeObserver();
    this.updateDimensions();
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getCSSWidth(): number {
    return this.width;
  }

  public getCSSHeight(): number {
    return this.height;
  }

  // --- Camera Viewport Transforms ---

  public getZoom(): number {
    return this.zoom;
  }

  public getPan(): { panX: number; panY: number } {
    return { panX: this.panX, panY: this.panY };
  }

  public setZoom(newZoom: number, centerPx?: { x: number; y: number }): void {
    const clampedZoom = Math.max(0.2, Math.min(5.0, newZoom));
    if (clampedZoom === this.zoom) return;

    const center = centerPx || { x: this.width / 2, y: this.height / 2 };

    // Zoom anchored around specified viewport center point
    const worldBefore = this.screenToWorldPx(center.x, center.y);
    this.zoom = clampedZoom;
    const screenAfter = this.worldPxToScreen(worldBefore.x, worldBefore.y);

    this.panX += center.x - screenAfter.x;
    this.panY += center.y - screenAfter.y;

    this.applyTransform();
    if (this.onResizeCallback) {
      this.onResizeCallback();
    }
  }

  public setPan(deltaX: number, deltaY: number): void {
    this.panX += deltaX;
    this.panY += deltaY;
    this.applyTransform();
    if (this.onResizeCallback) {
      this.onResizeCallback();
    }
  }

  public resetCamera(): void {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
    if (this.onResizeCallback) {
      this.onResizeCallback();
    }
  }

  public applyTransform(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);
  }

  private updateDimensions(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.applyTransform();

    if (this.onResizeCallback) {
      this.onResizeCallback();
    }
  }

  private initResizeObserver(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.updateDimensions();
    });
    resizeObserver.observe(this.container);

    window.addEventListener('resize', () => {
      this.updateDimensions();
    });
  }

  // --- Coordinate Transformations (Screen <-> Normalized World) ---

  /**
   * Converts raw mouse client coordinates into World Pixel Space (incorporating Pan & Zoom).
   */
  public screenToWorldPx(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    return {
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom,
    };
  }

  /**
   * Converts World Pixel Space back into Viewport Screen Pixels.
   */
  public worldPxToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.zoom + this.panX,
      y: worldY * this.zoom + this.panY,
    };
  }

  /**
   * Converts raw pointer client coordinates into normalized floating point coordinates (0.0 to 1.0)
   * in World Space.
   */
  public normalizeCoordinates(clientX: number, clientY: number): Point {
    const worldPx = this.screenToWorldPx(clientX, clientY);
    return {
      x: this.width > 0 ? worldPx.x / this.width : 0,
      y: this.height > 0 ? worldPx.y / this.height : 0,
    };
  }

  /**
   * Converts normalized World coordinates (0.0 to 1.0) back to World Pixel coordinates.
   */
  public denormalizeCoordinates(point: Point): { x: number; y: number } {
    return {
      x: point.x * this.width,
      y: point.y * this.height,
    };
  }

  /**
   * Clears the entire canvas viewport accounting for camera transforms.
   */
  public clear(): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }
}
