import * as THREE from 'three';
import { DrawingOperation } from '../../../shared/protocol';

export class Exporter3D {
  /**
   * Exports WebGL 3D canvas viewport as a PNG snapshot download.
   */
  public static exportToPNG(renderer: THREE.WebGLRenderer, filename: string = '3d-spatial-canvas.png'): void {
    renderer.render(renderer.getContext() as any, (renderer as any).camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exports room 3D vector and mesh operation history as a native Wavefront OBJ 3D Model file.
   */
  public static exportToOBJ(operations: DrawingOperation[], filename: string = 'spatial-model.obj'): void {
    const activeOps = operations
      .filter((op) => op.active)
      .sort((a, b) => a.sequence - b.sequence);

    let objContent = `# Real-Time Collaborative 3D Canvas Spatial Model\n# Total Operations: ${activeOps.length}\n\n`;
    let vertexOffset = 1;

    activeOps.forEach((op, index) => {
      if (!op.points || op.points.length === 0) return;

      objContent += `o Operation_${op.id}_${op.tool}\n`;

      if (op.tool === 'box') {
        const start = op.points[0];
        const end = op.points[op.points.length - 1];
        const minX = Math.min(start.x, end.x), maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y), maxY = Math.max(start.y, end.y);
        const minZ = Math.min(start.z, end.z), maxZ = Math.max(start.z, end.z);

        // 8 vertices of cube
        objContent += `v ${minX} ${minY} ${minZ}\n`;
        objContent += `v ${maxX} ${minY} ${minZ}\n`;
        objContent += `v ${maxX} ${maxY} ${minZ}\n`;
        objContent += `v ${minX} ${maxY} ${minZ}\n`;
        objContent += `v ${minX} ${minY} ${maxZ}\n`;
        objContent += `v ${maxX} ${minY} ${maxZ}\n`;
        objContent += `v ${maxX} ${maxY} ${maxZ}\n`;
        objContent += `v ${minX} ${maxY} ${maxZ}\n`;

        // 12 triangular faces
        const v = vertexOffset;
        objContent += `f ${v} ${v+1} ${v+2}\n`;
        objContent += `f ${v} ${v+2} ${v+3}\n`;
        objContent += `f ${v+4} ${v+7} ${v+6}\n`;
        objContent += `f ${v+4} ${v+6} ${v+5}\n`;
        objContent += `f ${v} ${v+4} ${v+5}\n`;
        objContent += `f ${v} ${v+5} ${v+1}\n`;
        objContent += `f ${v+1} ${v+5} ${v+6}\n`;
        objContent += `f ${v+1} ${v+6} ${v+2}\n`;
        objContent += `f ${v+2} ${v+6} ${v+7}\n`;
        objContent += `f ${v+2} ${v+7} ${v+3}\n`;
        objContent += `f ${v+3} ${v+7} ${v+4}\n`;
        objContent += `f ${v+3} ${v+4} ${v}\n`;

        vertexOffset += 8;
        return;
      }

      // Freehand 3D Stroke Vertices
      op.points.forEach((p) => {
        objContent += `v ${p.x} ${p.y} ${p.z}\n`;
      });

      if (op.points.length >= 2) {
        objContent += `l`;
        for (let i = 0; i < op.points.length; i++) {
          objContent += ` ${vertexOffset + i}`;
        }
        objContent += `\n`;
      }

      vertexOffset += op.points.length;
    });

    const blob = new Blob([objContent], { type: 'text/plain;charset=utf-8' });
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
