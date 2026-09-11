import { DrawingOperation } from '../../../shared/protocol';

export class CanvasExporter {
  /**
   * Exports the current canvas viewport as a PNG image download.
   */
  public static exportToPNG(canvas: HTMLCanvasElement, filename: string = 'canvas-drawing.png'): void {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exports room operation vector history as a native, scalable Vector SVG file download.
   */
  public static exportToSVG(
    operations: DrawingOperation[],
    width: number,
    height: number,
    filename: string = 'canvas-drawing.svg'
  ): void {
    const activeOps = operations
      .filter((op) => op.active)
      .sort((a, b) => a.sequence - b.sequence);

    let svgElements = '';

    activeOps.forEach((op) => {
      if (!op.points || op.points.length === 0) return;

      const pxPoints = op.points.map((p) => ({
        x: p.x * width,
        y: p.y * height,
      }));

      if (op.tool === 'text') {
        const fontSize = Math.max(14, op.width * 3);
        const text = op.text || '';
        svgElements += `<text x="${pxPoints[0].x}" y="${pxPoints[0].y}" font-family="Inter, sans-serif" font-size="${fontSize}" font-weight="600" fill="${op.color}">${escapeXml(text)}</text>\n`;
        return;
      }

      if (op.tool === 'rectangle') {
        const start = pxPoints[0];
        const end = pxPoints[pxPoints.length - 1];
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.abs(end.x - start.x);
        const h = Math.abs(end.y - start.y);
        svgElements += `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${op.color}" stroke-width="${op.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
        return;
      }

      if (op.tool === 'ellipse') {
        const start = pxPoints[0];
        const end = pxPoints[pxPoints.length - 1];
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        svgElements += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${op.color}" stroke-width="${op.width}" fill="none"/>\n`;
        return;
      }

      if (op.tool === 'line') {
        const start = pxPoints[0];
        const end = pxPoints[pxPoints.length - 1];
        svgElements += `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${op.color}" stroke-width="${op.width}" stroke-linecap="round"/>\n`;
        return;
      }

      // Smooth Brush / Eraser Path
      if (pxPoints.length === 1) {
        svgElements += `<circle cx="${pxPoints[0].x}" cy="${pxPoints[0].y}" r="${op.width / 2}" fill="${op.color}"/>\n`;
      } else {
        let pathData = `M ${pxPoints[0].x} ${pxPoints[0].y} `;
        for (let i = 1; i < pxPoints.length - 1; i++) {
          const midX = (pxPoints[i].x + pxPoints[i + 1].x) / 2;
          const midY = (pxPoints[i].y + pxPoints[i + 1].y) / 2;
          pathData += `Q ${pxPoints[i].x} ${pxPoints[i].y}, ${midX} ${midY} `;
        }
        const last = pxPoints[pxPoints.length - 1];
        pathData += `L ${last.x} ${last.y}`;

        const strokeColor = op.tool === 'eraser' ? '#FFFFFF' : op.color;
        svgElements += `<path d="${pathData}" stroke="${strokeColor}" stroke-width="${op.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
      }
    });

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
${svgElements}
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
