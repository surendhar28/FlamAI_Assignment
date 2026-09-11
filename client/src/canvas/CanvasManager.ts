import { Point } from '../../../shared/protocol';

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;
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

  public setResizeCallback(callback: () => void): void {
    this.onResizeCallback = callback;
  }

  /**
   * Updates internal canvas dimensions accounting for high-DPI (Retina) displays.
   */
  private updateDimensions(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;

    // Set actual canvas pixel resolution
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    // Reset transformations and scale context for Retina crispness
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

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

  /**
   * Converts raw pointer event coordinates (relative to canvas container)
   * into normalized floating point coordinates (0.0 to 1.0).
   */
  public normalizeCoordinates(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    return {
      x: this.width > 0 ? Math.max(0, Math.min(1, px / this.width)) : 0,
      y: this.height > 0 ? Math.max(0, Math.min(1, py / this.height)) : 0,
    };
  }

  /**
   * Converts normalized floating point coordinates (0.0 to 1.0)
   * back to pixel coordinates on the current canvas container.
   */
  public denormalizeCoordinates(point: Point): { x: number; y: number } {
    return {
      x: point.x * this.width,
      y: point.y * this.height,
    };
  }

  /**
   * Clears the entire canvas viewport cleanly.
   */
  public clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
