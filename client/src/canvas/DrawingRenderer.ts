import { CanvasManager } from './CanvasManager';
import { DrawingOperation, DrawingTool, Point } from '../../../shared/protocol';

export class DrawingRenderer {
  private canvasManager: CanvasManager;

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;
  }

  /**
   * Renders a single point or dot when user clicks without dragging.
   */
  public renderDot(tool: DrawingTool, color: string, width: number, point: Point): void {
    const ctx = this.canvasManager.getContext();
    const pxPoint = this.canvasManager.denormalizeCoordinates(point);

    ctx.save();
    this.configureContext(ctx, tool, color, width);

    ctx.beginPath();
    ctx.arc(pxPoint.x, pxPoint.y, width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Incremental renderer: Draws a line segment between two consecutive points.
   * Used during live active drawing to achieve instant 60 FPS feedback without redrawing entire canvas.
   */
  public renderSegment(
    tool: DrawingTool,
    color: string,
    width: number,
    start: Point,
    end: Point
  ): void {
    const ctx = this.canvasManager.getContext();
    const p1 = this.canvasManager.denormalizeCoordinates(start);
    const p2 = this.canvasManager.denormalizeCoordinates(end);

    ctx.save();
    this.configureContext(ctx, tool, color, width);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Path renderer: Draws a full smooth stroke using quadratic curve interpolation.
   */
  public renderSmoothPath(
    tool: DrawingTool,
    color: string,
    width: number,
    points: Point[]
  ): void {
    if (!points || points.length === 0) return;

    if (points.length === 1) {
      this.renderDot(tool, color, width, points[0]);
      return;
    }

    const ctx = this.canvasManager.getContext();
    const pxPoints = points.map((p) => this.canvasManager.denormalizeCoordinates(p));

    ctx.save();
    this.configureContext(ctx, tool, color, width);

    ctx.beginPath();
    ctx.moveTo(pxPoints[0].x, pxPoints[0].y);

    if (pxPoints.length === 2) {
      ctx.lineTo(pxPoints[1].x, pxPoints[1].y);
    } else {
      // Quadratic curve interpolation anchored by midpoints
      for (let i = 1; i < pxPoints.length - 1; i++) {
        const midX = (pxPoints[i].x + pxPoints[i + 1].x) / 2;
        const midY = (pxPoints[i].y + pxPoints[i + 1].y) / 2;
        ctx.quadraticCurveTo(pxPoints[i].x, pxPoints[i].y, midX, midY);
      }
      // Connect final point
      const last = pxPoints[pxPoints.length - 1];
      ctx.lineTo(last.x, last.y);
    }

    ctx.stroke();
    ctx.restore();
  }

  /**
   * Full Canvas Reconstruction:
   * Clears viewport and re-renders all active operations sorted by server sequence number.
   */
  public reconstructCanvas(operations: DrawingOperation[]): void {
    this.canvasManager.clear();

    // Filter active operations (exclude tombstones) and sort by sequence number
    const activeOps = operations
      .filter((op) => op.active)
      .sort((a, b) => a.sequence - b.sequence);

    for (const op of activeOps) {
      this.renderSmoothPath(op.tool, op.color, op.width, op.points);
    }
  }

  /**
   * Context stroke styling helper.
   */
  private configureContext(
    ctx: CanvasRenderingContext2D,
    tool: DrawingTool,
    color: string,
    width: number
  ): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
    }
  }
}
