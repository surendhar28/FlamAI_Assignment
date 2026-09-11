import * as THREE from 'three';
import { Canvas3DManager } from '../canvas/Canvas3DManager';
import { DrawingStore } from '../state/DrawingStore';

export class Cursors3D {
  private store: DrawingStore;
  private canvas3DManager: Canvas3DManager;
  private cursorMeshes: Map<string, THREE.Group> = new Map();

  constructor(store: DrawingStore, canvas3DManager: Canvas3DManager) {
    this.store = store;
    this.canvas3DManager = canvas3DManager;

    this.store.subscribe(() => this.render());
  }

  public render(): void {
    const scene = this.canvas3DManager.getScene();
    const users = this.store.getUsers();
    const myUser = this.store.getMyUser();
    const activeUserIds = new Set<string>();

    users.forEach((user) => {
      if (myUser && user.id === myUser.id) return;
      if (!user.cursor) return;

      activeUserIds.add(user.id);
      let cursorGroup = this.cursorMeshes.get(user.id);

      if (!cursorGroup) {
        cursorGroup = this.create3DCursorMesh(user.name, user.color);
        scene.add(cursorGroup);
        this.cursorMeshes.set(user.id, cursorGroup);
      }

      // Position 3D cursor mesh in spatial world
      cursorGroup.position.set(user.cursor.x, user.cursor.y + 0.2, user.cursor.z);
    });

    // Cleanup disconnected user 3D cursors
    this.cursorMeshes.forEach((group, id) => {
      if (!activeUserIds.has(id)) {
        scene.remove(group);
        this.cursorMeshes.delete(id);
      }
    });

    this.canvas3DManager.render();
  }

  private create3DCursorMesh(userName: string, userColorHexStr: string): THREE.Group {
    const group = new THREE.Group();
    const colorHex = parseInt(userColorHexStr.replace('#', '0x'), 16);

    // 3D Pointer Cone
    const coneGeom = new THREE.ConeGeometry(0.2, 0.6, 16);
    coneGeom.rotateX(Math.PI); // Point downwards
    const coneMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.2 });
    const coneMesh = new THREE.Mesh(coneGeom, coneMat);
    coneMesh.position.y = 0.3;
    group.add(coneMesh);

    // 3D Name Tag Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.font = '700 24px Inter, sans-serif';
    ctx.fillStyle = userColorHexStr;
    ctx.fillText(userName, 10, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 0.8, 0);
    sprite.scale.set(2, 0.5, 1);
    group.add(sprite);

    return group;
  }
}
