import * as THREE from 'three';
import { Point3D } from '../../../shared/protocol';

export type ViewPreset = 'isometric' | 'top' | 'front' | 'side';

export class Canvas3DManager {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // 3D Helpers & Lighting
  private gridHelper: THREE.GridHelper;
  private axesHelper: THREE.AxesHelper;
  private drawingPlane: THREE.Plane;
  private raycaster: THREE.Raycaster;

  // Camera Orbit & Pan Navigation State
  private cameraRadius: number = 25;
  private theta: number = Math.PI / 4; // Azimuth angle
  private phi: number = Math.PI / 3;   // Polar angle
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private isOrbiting: boolean = false;
  private isPanning: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };

  private onResizeCallback?: () => void;

  constructor(canvasId: string, containerId: string) {
    const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement | null;
    const containerEl = document.getElementById(containerId);

    if (!canvasEl || !containerEl) {
      throw new Error(`Canvas3DManager: Missing #${canvasId} or #${containerId} elements in DOM.`);
    }

    this.canvas = canvasEl;
    this.container = containerEl;

    // 1. Initialize Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0F172A');

    // 2. Initialize Camera
    const aspect = containerEl.clientWidth / containerEl.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.updateCameraPosition();

    // 3. Initialize WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    this.renderer.shadowMap.enabled = true;

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // 5. 3D Grid & Axis Helpers
    this.gridHelper = new THREE.GridHelper(50, 50, 0x3b82f6, 0x334155);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(3);
    this.scene.add(this.axesHelper);

    // 6. Raycasting Setup (Drawing Plane at Y = 0)
    this.drawingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();

    this.initResizeObserver();
    this.initNavigationListeners();
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public setResizeCallback(callback: () => void): void {
    this.onResizeCallback = callback;
  }

  // --- Camera & View Angle Presets ---

  public setViewPreset(preset: ViewPreset): void {
    switch (preset) {
      case 'isometric':
        this.theta = Math.PI / 4;
        this.phi = Math.PI / 3;
        this.cameraRadius = 25;
        this.target.set(0, 0, 0);
        break;
      case 'top':
        this.theta = 0;
        this.phi = 0.001; // Avoid exact zero singularity
        this.cameraRadius = 30;
        this.target.set(0, 0, 0);
        break;
      case 'front':
        this.theta = 0;
        this.phi = Math.PI / 2;
        this.cameraRadius = 25;
        this.target.set(0, 0, 0);
        break;
      case 'side':
        this.theta = Math.PI / 2;
        this.phi = Math.PI / 2;
        this.cameraRadius = 25;
        this.target.set(0, 0, 0);
        break;
    }
    this.updateCameraPosition();
  }

  public setZoom(zoomFactor: number): void {
    this.cameraRadius = Math.max(5, Math.min(100, this.cameraRadius * zoomFactor));
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    this.camera.position.x =
      this.target.x + this.cameraRadius * Math.sin(this.phi) * Math.sin(this.theta);
    this.camera.position.y =
      this.target.y + this.cameraRadius * Math.cos(this.phi);
    this.camera.position.z =
      this.target.z + this.cameraRadius * Math.sin(this.phi) * Math.cos(this.theta);

    this.camera.lookAt(this.target);
    this.render();
  }

  private initNavigationListeners(): void {
    const canvas = this.canvas;

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
      this.setZoom(zoomFactor);
    }, { passive: false });
  }

  /**
   * Raycasts screen pointer coordinates (clientX, clientY) onto the 3D drawing plane.
   */
  public screenToWorld3D(clientX: number, clientY: number): Point3D {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const targetVector = new THREE.Vector3();
    const intersectPoint = this.raycaster.ray.intersectPlane(this.drawingPlane, targetVector);

    if (intersectPoint) {
      return {
        x: Math.round(intersectPoint.x * 100) / 100,
        y: Math.round(intersectPoint.y * 100) / 100,
        z: Math.round(intersectPoint.z * 100) / 100,
      };
    }

    return { x: 0, y: 0, z: 0 };
  }

  public handleOrbitPan(dx: number, dy: number, isRightClickOrShift: boolean): void {
    if (isRightClickOrShift) {
      // Pan camera target in 3D plane
      const panSpeed = 0.03 * (this.cameraRadius / 25);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

      this.target.addScaledVector(right, -dx * panSpeed);
      this.target.addScaledVector(up, dy * panSpeed);
    } else {
      // Orbit camera rotation
      const rotSpeed = 0.005;
      this.theta -= dx * rotSpeed;
      this.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.phi - dy * rotSpeed));
    }
    this.updateCameraPosition();
  }

  private initResizeObserver(): void {
    const resizeObserver = new ResizeObserver(() => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width === 0 || height === 0) return;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.render();

      if (this.onResizeCallback) this.onResizeCallback();
    });
    resizeObserver.observe(this.container);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
