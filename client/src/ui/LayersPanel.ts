import { CanvasLayer } from '../../../shared/protocol';

export interface LayersPanelCallbacks {
  onLayerSelect: (layerId: string) => void;
  onLayerAdd: (name: string) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
}

export class LayersPanel {
  private callbacks: LayersPanelCallbacks;
  private layers: CanvasLayer[] = [
    { id: 'default-layer', name: 'Layer 1', visible: true, locked: false },
  ];
  private activeLayerId: string = 'default-layer';

  private listEl: HTMLElement;
  private addBtnEl: HTMLButtonElement;

  constructor(callbacks: LayersPanelCallbacks) {
    this.callbacks = callbacks;
    this.listEl = document.getElementById('layer-list') as HTMLElement;
    this.addBtnEl = document.getElementById('btn-add-layer') as HTMLButtonElement;

    this.initEventListeners();
    this.render();
  }

  public getActiveLayerId(): string {
    return this.activeLayerId;
  }

  public getLayers(): CanvasLayer[] {
    return this.layers;
  }

  private initEventListeners(): void {
    this.addBtnEl.addEventListener('click', () => {
      const name = prompt('Enter Layer Name:', `Layer ${this.layers.length + 1}`);
      if (name && name.trim().length > 0) {
        const newLayer: CanvasLayer = {
          id: `layer_${Date.now()}`,
          name: name.trim(),
          visible: true,
          locked: false,
        };
        this.layers.push(newLayer);
        this.activeLayerId = newLayer.id;
        this.callbacks.onLayerAdd(newLayer.name);
        this.render();
      }
    });
  }

  public render(): void {
    this.listEl.innerHTML = '';

    this.layers.forEach((layer) => {
      const li = document.createElement('li');
      li.className = `layer-item ${layer.id === this.activeLayerId ? 'active' : ''}`;
      li.style.cursor = 'pointer';

      const left = document.createElement('div');
      left.className = 'layer-item-left';

      const visIcon = document.createElement('span');
      visIcon.className = 'layer-action-icon';
      visIcon.textContent = layer.visible ? '👁️' : '🙈';
      visIcon.title = layer.visible ? 'Hide Layer' : 'Show Layer';
      visIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        layer.visible = !layer.visible;
        this.callbacks.onLayerToggleVisibility(layer.id);
        this.render();
      });

      const label = document.createElement('span');
      label.className = 'layer-name';
      label.textContent = layer.name;

      left.appendChild(visIcon);
      left.appendChild(label);

      const lockIcon = document.createElement('span');
      lockIcon.className = 'layer-action-icon';
      lockIcon.textContent = layer.locked ? '🔒' : '🔓';
      lockIcon.title = layer.locked ? 'Unlock Layer' : 'Lock Layer';
      lockIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        layer.locked = !layer.locked;
        this.callbacks.onLayerToggleLock(layer.id);
        this.render();
      });

      li.appendChild(left);
      li.appendChild(lockIcon);

      li.addEventListener('click', () => {
        this.activeLayerId = layer.id;
        this.callbacks.onLayerSelect(layer.id);
        this.render();
      });

      this.listEl.appendChild(li);
    });
  }
}
