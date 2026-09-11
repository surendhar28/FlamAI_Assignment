import { DrawingTool } from '../../../shared/protocol';
import { ViewPreset } from '../canvas/Canvas3DManager';

export interface ToolbarCallbacks {
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onViewPresetChange: (preset: ViewPreset) => void;
  onExportOBJ: () => void;
  onExportPNG: () => void;
}

export class Toolbar {
  private callbacks: ToolbarCallbacks;
  private currentTool: DrawingTool = 'brush';
  private currentColor: string = '#3B82F6';
  private currentWidth: number = 5;

  // DOM Elements
  private toolButtons: Map<DrawingTool, HTMLButtonElement> = new Map();
  private viewButtons: Map<ViewPreset, HTMLButtonElement> = new Map();
  private colorSwatches: NodeListOf<HTMLButtonElement>;
  private colorPicker: HTMLInputElement;
  private widthSlider: HTMLInputElement;
  private widthValueText: HTMLElement;
  private btnUndo: HTMLButtonElement;
  private btnRedo: HTMLButtonElement;
  private btnExportOBJ: HTMLButtonElement;
  private btnExportPNG: HTMLButtonElement;

  constructor(callbacks: ToolbarCallbacks) {
    this.callbacks = callbacks;

    const toolIds: { tool: DrawingTool; id: string }[] = [
      { tool: 'brush', id: 'btn-brush' },
      { tool: 'eraser', id: 'btn-eraser' },
      { tool: 'box', id: 'btn-box' },
      { tool: 'sphere', id: 'btn-sphere' },
      { tool: 'cylinder', id: 'btn-cylinder' },
      { tool: 'line', id: 'btn-line' },
      { tool: 'text', id: 'btn-text' },
      { tool: 'select', id: 'btn-select' },
      { tool: 'orbit', id: 'btn-orbit' },
    ];

    toolIds.forEach(({ tool, id }) => {
      const el = document.getElementById(id) as HTMLButtonElement | null;
      if (el) this.toolButtons.set(tool, el);
    });

    const viewIds: { preset: ViewPreset; id: string }[] = [
      { preset: 'isometric', id: 'btn-view-iso' },
      { preset: 'top', id: 'btn-view-top' },
      { preset: 'front', id: 'btn-view-front' },
      { preset: 'side', id: 'btn-view-side' },
    ];

    viewIds.forEach(({ preset, id }) => {
      const el = document.getElementById(id) as HTMLButtonElement | null;
      if (el) this.viewButtons.set(preset, el);
    });

    this.colorSwatches = document.querySelectorAll('.color-swatch');
    this.colorPicker = document.getElementById('picker-color') as HTMLInputElement;
    this.widthSlider = document.getElementById('slider-width') as HTMLInputElement;
    this.widthValueText = document.getElementById('width-value') as HTMLElement;
    this.btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
    this.btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;
    this.btnExportOBJ = document.getElementById('btn-export-obj') as HTMLButtonElement;
    this.btnExportPNG = document.getElementById('btn-export-png') as HTMLButtonElement;

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

    this.viewButtons.forEach((btn, preset) => {
      btn.addEventListener('click', () => {
        this.viewButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.callbacks.onViewPresetChange(preset);
      });
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

    this.btnExportOBJ.addEventListener('click', () => this.callbacks.onExportOBJ());
    this.btnExportPNG.addEventListener('click', () => this.callbacks.onExportPNG());
  }

  public setTool(tool: DrawingTool): void {
    this.currentTool = tool;
    this.toolButtons.forEach((btn, t) => {
      btn.classList.toggle('active', t === tool);
    });
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
    this.widthValueText.textContent = `${width}`;
    this.callbacks.onWidthChange(width);
  }

  private initKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const key = e.key.toLowerCase();
      if (key === 'b') this.setTool('brush');
      else if (key === 'e') this.setTool('eraser');
      else if (key === 'x') this.setTool('box');
      else if (key === 's') this.setTool('sphere');
      else if (key === 'c') this.setTool('cylinder');
      else if (key === 'l') this.setTool('line');
      else if (key === 't') this.setTool('text');
      else if (key === 'o') this.setTool('orbit');
      else if ((e.ctrlKey || e.metaKey) && key === 'z') {
        if (e.shiftKey) this.callbacks.onRedo();
        else this.callbacks.onUndo();
      } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
        this.callbacks.onRedo();
      }
    });
  }
}
