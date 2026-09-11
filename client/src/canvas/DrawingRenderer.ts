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
   * Used during live active brush drawing.
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
   * Multi-Tool Renderer: Draws smooth brush strokes, straight lines, rectangles, ellipses, and text annotations.
   */
  public renderOperation(op: DrawingOperation): void {
    if (!op || !op.points || op.points.length === 0) return;

    const ctx = this.canvasManager.getContext();
    const pxPoints = op.points.map((p) => this.canvasManager.denormalizeCoordinates(p));

    ctx.save();
    this.configureContext(ctx, op.tool, op.color, op.width);

    switch (op.tool as string) {
      case 'line':
        this.renderLinePath(ctx, pxPoints);
        break;
      case 'rectangle':
        this.renderRectanglePath(ctx, pxPoints);
        break;
      case 'ellipse':
        this.renderEllipsePath(ctx, pxPoints);
        break;
      case 'text':
        this.renderTextAnnotation(ctx, op.text || '', pxPoints[0], op.width, op.color);
        break;
      case 'brush':
      case 'eraser':
      default:
        this.renderSmoothBrushPath(ctx, pxPoints, op.tool, op.color, op.width);
        break;
    }

    ctx.restore();
  }

  /**
   * Smooth Brush / Eraser Path
   */
  private renderSmoothBrushPath(
    ctx: CanvasRenderingContext2D,
    pxPoints: { x: number; y: number }[],
    tool: DrawingTool,
    color: string,
    width: number
  ): void {
    if (pxPoints.length === 1) {
      ctx.beginPath();
      ctx.arc(pxPoints[0].x, pxPoints[0].y, width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pxPoints[0].x, pxPoints[0].y);

    if (pxPoints.length === 2) {
      ctx.lineTo(pxPoints[1].x, pxPoints[1].y);
    } else {
      for (let i = 1; i < pxPoints.length - 1; i++) {
        const midX = (pxPoints[i].x + pxPoints[i + 1].x) / 2;
        const midY = (pxPoints[i].y + pxPoints[i + 1].y) / 2;
        ctx.quadraticCurveTo(pxPoints[i].x, pxPoints[i].y, midX, midY);
      }
      const last = pxPoints[pxPoints.length - 1];
      ctx.lineTo(last.x, last.y);
    }

    ctx.stroke();
  }

  /**
   * Straight Line Path
   */
  private renderLinePath(
    ctx: CanvasRenderingContext2D,
    pxPoints: { x: number; y: number }[]
  ): void {
    const start = pxPoints[0];
    const end = pxPoints[pxPoints.length - 1];

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  /**
   * Rectangle Path
   */
  private renderRectanglePath(
    ctx: CanvasRenderingContext2D,
    pxPoints: { x: number; y: number }[]
  ): void {
    const start = pxPoints[0];
    const end = pxPoints[pxPoints.length - 1];
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);

    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.stroke();
  }

  /**
   * Ellipse Path
   */
  private renderEllipsePath(
    ctx: CanvasRenderingContext2D,
    pxPoints: { x: number; y: number }[]
  ): void {
    const start = pxPoints[0];
    const end = pxPoints[pxPoints.length - 1];
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;

    if (radiusX <= 0 || radiusY <= 0) return;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Text Annotation Renderer
   */
  private renderTextAnnotation(
    ctx: CanvasRenderingContext2D,
    text: string,
    pxPoint: { x: number; y: number },
    width: number,
    color: string
  ): void {
    if (!text || text.trim() === '') return;

    const fontSize = Math.max(14, width * 3);
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.fillText(text, pxPoint.x, pxPoint.y);
  }

  /**
   * Selection Bounding Box Renderer (for Selected Vector Operations)
   */
  public renderSelectionBoundingBox(op: DrawingOperation): void {
    if (!op || !op.points || op.points.length === 0) return;

    const ctx = this.canvasManager.getContext();
    const pxPoints = op.points.map((p) => this.canvasManager.denormalizeCoordinates(p));

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pxPoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });

    const padding = 8;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    const width = maxX - minX;
    const height = maxY - minY;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Overlay in screen viewport space
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);

    ctx.strokeRect(minX, minY, width, height);

    // Render corner resize handles
    ctx.fillStyle = '#FFFFFF';
    ctx.setLineDash([]);
    const handleSize = 6;
    const corners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
    ];

    corners.forEach((c) => {
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    });

    ctx.restore();
  }

  /**
   * Full Canvas Reconstruction:
   * Clears viewport and re-renders all active operations sorted by server sequence number.
   */
  public reconstructCanvas(
    operations: DrawingOperation[],
    selectedOpId?: string | null
  ): void {
    this.canvasManager.clear();

    // Filter active operations and sort by sequence number
    const activeOps = operations
      .filter((op) => op.active)
      .sort((a, b) => a.sequence - b.sequence);

    for (const op of activeOps) {
      this.renderOperation(op);
    }

    if (selectedOpId) {
      const selectedOp = activeOps.find((op) => op.id === selectedOpId);
      if (selectedOp) {
        this.renderSelectionBoundingBox(selectedOp);
      }
    }
  }

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
