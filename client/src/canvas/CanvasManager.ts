import { Point } from '../../../shared/protocol';

export type GridMode = 'none' | 'dots' | 'grid';

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

  // Smart Grid & Snapping State
  private gridMode: GridMode = 'dots';
  private snapToGrid: boolean = true;
  private readonly GRID_SIZE: number = 20; // 20px grid step

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

  // --- Grid & Snapping API ---

  public getGridMode(): GridMode {
    return this.gridMode;
  }

  public toggleGridMode(): GridMode {
    const modes: GridMode[] = ['dots', 'grid', 'none'];
    const nextIndex = (modes.indexOf(this.gridMode) + 1) % modes.length;
    this.gridMode = modes[nextIndex];
    if (this.onResizeCallback) this.onResizeCallback();
    return this.gridMode;
  }

  public isSnapToGrid(): boolean {
    return this.snapToGrid;
  }

  public toggleSnapToGrid(): boolean {
    this.snapToGrid = !this.snapToGrid;
    return this.snapToGrid;
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

    const worldBefore = this.screenToWorldPx(center.x, center.y);
    this.zoom = clampedZoom;
    const screenAfter = this.worldPxToScreen(worldBefore.x, worldBefore.y);

    this.panX += center.x - screenAfter.x;
    this.panY += center.y - screenAfter.y;

    this.applyTransform();
    if (this.onResizeCallback) this.onResizeCallback();
  }

  public setPan(deltaX: number, deltaY: number): void {
    this.panX += deltaX;
    this.panY += deltaY;
    this.applyTransform();
    if (this.onResizeCallback) this.onResizeCallback();
  }

  public resetCamera(): void {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
    if (this.onResizeCallback) this.onResizeCallback();
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

    if (this.onResizeCallback) this.onResizeCallback();
  }

  private initResizeObserver(): void {
    const resizeObserver = new ResizeObserver(() => this.updateDimensions());
    resizeObserver.observe(this.container);
    window.addEventListener('resize', () => this.updateDimensions());
  }

  // --- Coordinate Transformations & Snapping ---

  public screenToWorldPx(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    let worldX = (screenX - this.panX) / this.zoom;
    let worldY = (screenY - this.panY) / this.zoom;

    if (this.snapToGrid) {
      worldX = Math.round(worldX / this.GRID_SIZE) * this.GRID_SIZE;
      worldY = Math.round(worldY / this.GRID_SIZE) * this.GRID_SIZE;
    }

    return { x: worldX, y: worldY };
  }

  public worldPxToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.zoom + this.panX,
      y: worldY * this.zoom + this.panY,
    };
  }

  public normalizeCoordinates(clientX: number, clientY: number): Point {
    const worldPx = this.screenToWorldPx(clientX, clientY);
    return {
      x: this.width > 0 ? worldPx.x / this.width : 0,
      y: this.height > 0 ? worldPx.y / this.height : 0,
      z: 0,
    };
  }

  public denormalizeCoordinates(point: Point): { x: number; y: number } {
    return {
      x: point.x * this.width,
      y: point.y * this.height,
    };
  }

  public setResizeCallback(callback: () => void): void {
    this.onResizeCallback = callback;
  }

  /**
   * Clears the viewport and renders background smart grid.
   */
  public clear(): void {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    this.renderBackgroundGrid();
  }

  private renderBackgroundGrid(): void {
    if (this.gridMode === 'none') return;

    this.ctx.save();
    const step = this.GRID_SIZE;
    const startX = Math.floor(-this.panX / (this.zoom * step)) * step - step;
    const endX = startX + (this.width / this.zoom) + step * 2;
    const startY = Math.floor(-this.panY / (this.zoom * step)) * step - step;
    const endY = startY + (this.height / this.zoom) + step * 2;

    this.ctx.strokeStyle = '#E2E8F0';
    this.ctx.fillStyle = '#CBD5E1';
    this.ctx.lineWidth = 0.5 / this.zoom;

    if (this.gridMode === 'dots') {
      const dotRadius = 1.2 / this.zoom;
      for (let x = startX; x < endX; x += step) {
        for (let y = startY; y < endY; y += step) {
          this.ctx.beginPath();
          this.ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    } else if (this.gridMode === 'grid') {
      this.ctx.beginPath();
      for (let x = startX; x < endX; x += step) {
        this.ctx.moveTo(x, startY);
        this.ctx.lineTo(x, endY);
      }
      for (let y = startY; y < endY; y += step) {
        this.ctx.moveTo(startX, y);
        this.ctx.lineTo(endX, y);
      }
      this.ctx.stroke();
    }

    this.ctx.restore();
  }
}
