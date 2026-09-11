import { DrawingTool } from '../../../shared/protocol';

export interface ToolbarCallbacks {
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export class Toolbar {
  private callbacks: ToolbarCallbacks;
  private currentTool: DrawingTool = 'brush';
  private currentColor: string = '#1E293B';
  private currentWidth: number = 5;

  // DOM Elements
  private btnBrush: HTMLButtonElement;
  private btnEraser: HTMLButtonElement;
  private colorSwatches: NodeListOf<HTMLButtonElement>;
  private colorPicker: HTMLInputElement;
  private widthSlider: HTMLInputElement;
  private widthValueText: HTMLElement;
  private btnUndo: HTMLButtonElement;
  private btnRedo: HTMLButtonElement;

  constructor(callbacks: ToolbarCallbacks) {
    this.callbacks = callbacks;

    this.btnBrush = document.getElementById('btn-brush') as HTMLButtonElement;
    this.btnEraser = document.getElementById('btn-eraser') as HTMLButtonElement;
    this.colorSwatches = document.querySelectorAll('.color-swatch');
    this.colorPicker = document.getElementById('picker-color') as HTMLInputElement;
    this.widthSlider = document.getElementById('slider-width') as HTMLInputElement;
    this.widthValueText = document.getElementById('width-value') as HTMLElement;
    this.btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
    this.btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;

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
    // Tool buttons
    this.btnBrush.addEventListener('click', () => this.setTool('brush'));
    this.btnEraser.addEventListener('click', () => this.setTool('eraser'));

    // Color Swatches
    this.colorSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const color = swatch.getAttribute('data-color');
        if (color) {
          this.setColor(color);
        }
      });
    });

    // Custom Color Picker
    this.colorPicker.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.setColor(target.value);
    });

    // Width Slider
    this.widthSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseInt(target.value, 10);
      this.setWidth(val);
    });

    // Undo / Redo buttons
    this.btnUndo.addEventListener('click', () => this.callbacks.onUndo());
    this.btnRedo.addEventListener('click', () => this.callbacks.onRedo());
  }

  public setTool(tool: DrawingTool): void {
    this.currentTool = tool;
    this.btnBrush.classList.toggle('active', tool === 'brush');
    this.btnEraser.classList.toggle('active', tool === 'eraser');
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
      // Ignore key shortcuts if typing in an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'b' || e.key === 'B') {
        this.setTool('brush');
      } else if (e.key === 'e' || e.key === 'E') {
        this.setTool('eraser');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          this.callbacks.onRedo();
        } else {
          this.callbacks.onUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        this.callbacks.onRedo();
      }
    });
  }
}
