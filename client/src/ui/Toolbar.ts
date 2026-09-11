import { DrawingTool } from '../../../shared/protocol';

export interface ToolbarCallbacks {
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
}

export class Toolbar {
  private callbacks: ToolbarCallbacks;
  private currentTool: DrawingTool = 'brush';
  private currentColor: string = '#1E293B';
  private currentWidth: number = 5;

  // DOM Elements
  private toolButtons: Map<DrawingTool, HTMLButtonElement> = new Map();
  private colorSwatches: NodeListOf<HTMLButtonElement>;
  private colorPicker: HTMLInputElement;
  private widthSlider: HTMLInputElement;
  private widthValueText: HTMLElement;
  private btnUndo: HTMLButtonElement;
  private btnRedo: HTMLButtonElement;
  private btnZoomIn: HTMLButtonElement;
  private btnZoomOut: HTMLButtonElement;
  private btnZoomReset: HTMLButtonElement;
  private btnGridToggle: HTMLButtonElement;
  private btnSnapToggle: HTMLButtonElement;
  private btnExportPNG: HTMLButtonElement;
  private btnExportSVG: HTMLButtonElement;

  constructor(callbacks: ToolbarCallbacks) {
    this.callbacks = callbacks;

    const toolIds: { tool: DrawingTool; id: string }[] = [
      { tool: 'brush', id: 'btn-brush' },
      { tool: 'eraser', id: 'btn-eraser' },
      { tool: 'line', id: 'btn-line' },
      { tool: 'rectangle', id: 'btn-rect' },
      { tool: 'ellipse', id: 'btn-ellipse' },
      { tool: 'text', id: 'btn-text' },
      { tool: 'select', id: 'btn-select' },
      { tool: 'pan', id: 'btn-pan' },
    ];

    toolIds.forEach(({ tool, id }) => {
      const el = document.getElementById(id) as HTMLButtonElement | null;
      if (el) this.toolButtons.set(tool, el);
    });

    this.colorSwatches = document.querySelectorAll('.color-swatch');
    this.colorPicker = document.getElementById('picker-color') as HTMLInputElement;
    this.widthSlider = document.getElementById('slider-width') as HTMLInputElement;
    this.widthValueText = document.getElementById('width-value') as HTMLElement;
    this.btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
    this.btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;
    this.btnZoomIn = document.getElementById('btn-zoom-in') as HTMLButtonElement;
    this.btnZoomOut = document.getElementById('btn-zoom-out') as HTMLButtonElement;
    this.btnZoomReset = document.getElementById('btn-zoom-reset') as HTMLButtonElement;
    this.btnGridToggle = document.getElementById('btn-grid-toggle') as HTMLButtonElement;
    this.btnSnapToggle = document.getElementById('btn-snap-toggle') as HTMLButtonElement;
    this.btnExportPNG = document.getElementById('btn-export-png') as HTMLButtonElement;
    this.btnExportSVG = document.getElementById('btn-export-svg') as HTMLButtonElement;

    this.initEventListeners();
    this.initKeyboardShortcuts();
  }

  public getTool(): DrawingTool {
    return this.currentTool;
  }

  public getColor(): string {
    return this.currentColor;
  }

  public getWidth(): number {
    return this.currentWidth;
  }

  private initEventListeners(): void {
    this.toolButtons.forEach((btn, tool) => {
      btn.addEventListener('click', () => this.setTool(tool));
    });

    this.colorSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const color = swatch.getAttribute('data-color');
        if (color) this.setColor(color);
      });
    });

    this.colorPicker.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.setColor(target.value);
    });

    this.widthSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseInt(target.value, 10);
      this.setWidth(val);
    });

    this.btnUndo.addEventListener('click', () => this.callbacks.onUndo());
    this.btnRedo.addEventListener('click', () => this.callbacks.onRedo());

    this.btnZoomIn.addEventListener('click', () => this.callbacks.onZoomIn());
    this.btnZoomOut.addEventListener('click', () => this.callbacks.onZoomOut());
    this.btnZoomReset.addEventListener('click', () => this.callbacks.onZoomReset());

    this.btnGridToggle.addEventListener('click', () => this.callbacks.onToggleGrid());
    this.btnSnapToggle.addEventListener('click', () => {
      this.callbacks.onToggleSnap();
      this.btnSnapToggle.classList.toggle('active');
    });

    this.btnExportPNG.addEventListener('click', () => this.callbacks.onExportPNG());
    this.btnExportSVG.addEventListener('click', () => this.callbacks.onExportSVG());
  }

  public setTool(tool: DrawingTool): void {
    this.currentTool = tool;
    this.toolButtons.forEach((btn, t) => {
      btn.classList.toggle('active', t === tool);
    });

    const viewport = document.getElementById('canvas-viewport');
    if (viewport) {
      viewport.classList.toggle('pan-mode', tool === 'pan');
    }

    this.callbacks.onToolChange(tool);
  }

  public setColor(color: string): void {
    this.currentColor = color;
    this.colorPicker.value = color;

    this.colorSwatches.forEach((swatch) => {
      const swatchColor = swatch.getAttribute('data-color');
      swatch.classList.toggle('active', swatchColor?.toLowerCase() === color.toLowerCase());
    });

    this.callbacks.onColorChange(color);
  }

  public setWidth(width: number): void {
    this.currentWidth = width;
    this.widthSlider.value = width.toString();
    this.widthValueText.textContent = `${width}px`;
    this.callbacks.onWidthChange(width);
  }

  private initKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const key = e.key.toLowerCase();
      if (key === 'b') this.setTool('brush');
      else if (key === 'e') this.setTool('eraser');
      else if (key === 'l') this.setTool('line');
      else if (key === 'r') this.setTool('rectangle');
      else if (key === 'o') this.setTool('ellipse');
      else if (key === 't') this.setTool('text');
      else if (key === 's') this.setTool('select');
      else if (key === 'p') this.setTool('pan');
      else if ((e.ctrlKey || e.metaKey) && key === 'z') {
        if (e.shiftKey) this.callbacks.onRedo();
        else this.callbacks.onUndo();
      } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
        this.callbacks.onRedo();
      }
    });
  }
}
