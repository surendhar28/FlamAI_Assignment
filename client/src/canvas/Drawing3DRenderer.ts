import * as THREE from 'three';
import { Canvas3DManager } from './Canvas3DManager';
import { DrawingOperation, Point3D } from '../../../shared/protocol';

export class Drawing3DRenderer {
  private canvas3DManager: Canvas3DManager;
  private operationMeshMap: Map<string, THREE.Object3D> = new Map();
  private selectionBoxHelper: THREE.BoxHelper | null = null;

  constructor(canvas3DManager: Canvas3DManager) {
    this.canvas3DManager = canvas3DManager;
  }

  /**
   * Renders a single 3D Operation (stroke, 3D box, sphere, cylinder, or text sprite)
   * into the Three.js 3D Scene.
   */
  public renderOperation(op: DrawingOperation): THREE.Object3D | null {
    if (!op || !op.points || op.points.length === 0) return null;

    const scene = this.canvas3DManager.getScene();
    this.removeOperationMesh(op.id);

    const colorHex = parseInt(op.color.replace('#', '0x'), 16);
    const material = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    let mesh: THREE.Object3D | null = null;

    switch (op.tool) {
      case 'box':
        mesh = this.create3DBoxMesh(op.points, material);
        break;
      case 'sphere':
        mesh = this.create3DSphereMesh(op.points, material);
        break;
      case 'cylinder':
        mesh = this.create3DCylinderMesh(op.points, material);
        break;
      case 'line':
        mesh = this.create3DLineMesh(op.points, colorHex, op.width);
        break;
      case 'text':
        mesh = this.create3DTextSprite(op.text || '', op.points[0], op.color);
        break;
      case 'brush':
      case 'eraser':
      default:
        mesh = this.create3DFreehandRibbonMesh(op.points, material, op.width);
        break;
    }

    if (mesh) {
      mesh.name = op.id;
      scene.add(mesh);
      this.operationMeshMap.set(op.id, mesh);
      this.canvas3DManager.render();
    }

    return mesh;
  }

  private create3DBoxMesh(points: Point3D[], material: THREE.Material): THREE.Mesh {
    const start = points[0];
    const end = points[points.length - 1];

    const dx = Math.max(0.2, Math.abs(end.x - start.x));
    const dy = Math.max(0.2, Math.abs(end.y - start.y));
    const dz = Math.max(0.2, Math.abs(end.z - start.z));

    const geometry = new THREE.BoxGeometry(dx, dy, dz);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set((start.x + end.x) / 2, (start.y + end.y) / 2 + dy / 2, (start.z + end.z) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private create3DSphereMesh(points: Point3D[], material: THREE.Material): THREE.Mesh {
    const start = points[0];
    const end = points[points.length - 1];
    const radius = Math.max(0.2, Math.hypot(end.x - start.x, end.z - start.z) / 2);

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set((start.x + end.x) / 2, start.y + radius, (start.z + end.z) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private create3DCylinderMesh(points: Point3D[], material: THREE.Material): THREE.Mesh {
    const start = points[0];
    const end = points[points.length - 1];
    const radius = Math.max(0.2, Math.hypot(end.x - start.x, end.z - start.z) / 2);
    const height = Math.max(0.2, Math.abs(end.y - start.y));

    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set((start.x + end.x) / 2, start.y + height / 2, (start.z + end.z) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private create3DLineMesh(points: Point3D[], colorHex: number, width: number): THREE.Line {
    const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
    const p2 = new THREE.Vector3(
      points[points.length - 1].x,
      points[points.length - 1].y,
      points[points.length - 1].z
    );

    const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const lineMat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: width });
    return new THREE.Line(geometry, lineMat);
  }

  private create3DFreehandRibbonMesh(
    points: Point3D[],
    material: THREE.Material,
    width: number
  ): THREE.Object3D {
    if (points.length < 2) {
      const p = points[0];
      const geom = new THREE.SphereGeometry(width * 0.05, 16, 16);
      const mesh = new THREE.Mesh(geom, material);
      mesh.position.set(p.x, p.y + 0.05, p.z);
      return mesh;
    }

    const vectors = points.map((p) => new THREE.Vector3(p.x, p.y + 0.05, p.z));
    const curve = new THREE.CatmullRomCurve3(vectors);
    const tubeRadius = Math.max(0.04, width * 0.03);

    const geometry = new THREE.TubeGeometry(curve, Math.max(8, points.length * 4), tubeRadius, 8, false);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  private create3DTextSprite(text: string, point: Point3D, colorHexStr: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.font = '700 48px Inter, sans-serif';
    ctx.fillStyle = colorHexStr;
    ctx.textBaseline = 'middle';
    ctx.fillText(text || '3D Text', 20, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);

    sprite.position.set(point.x, point.y + 0.5, point.z);
    sprite.scale.set(4, 1, 1);
    return sprite;
  }

  public removeOperationMesh(operationId: string): void {
    const mesh = this.operationMeshMap.get(operationId);
    if (mesh) {
      this.canvas3DManager.getScene().remove(mesh);
      this.operationMeshMap.delete(operationId);
    }
  }

  public renderSelectionBoundingBox(selectedOpId: string | null): void {
    const scene = this.canvas3DManager.getScene();

    if (this.selectionBoxHelper) {
      scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper = null;
    }

    if (!selectedOpId) return;

    const selectedMesh = this.operationMeshMap.get(selectedOpId);
    if (selectedMesh) {
      this.selectionBoxHelper = new THREE.BoxHelper(selectedMesh, 0x3b82f6);
      scene.add(this.selectionBoxHelper);
    }
    this.canvas3DManager.render();
  }

  /**
   * Reconstructs complete 3D scene from active room operations.
   */
  public reconstruct3DScene(
    operations: DrawingOperation[],
    selectedOpId?: string | null
  ): void {
    const scene = this.canvas3DManager.getScene();

    // Clear existing dynamic meshes
    this.operationMeshMap.forEach((mesh) => scene.remove(mesh));
    this.operationMeshMap.clear();

    const activeOps = operations
      .filter((op) => op.active)
      .sort((a, b) => a.sequence - b.sequence);

    for (const op of activeOps) {
      this.renderOperation(op);
    }

    this.renderSelectionBoundingBox(selectedOpId || null);
    this.canvas3DManager.render();
  }
}
