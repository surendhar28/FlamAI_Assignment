import { ConnectionStatus } from '../network/SocketClient';

export class StatusIndicator {
  private containerEl: HTMLElement;
  private textEl: HTMLElement;

  constructor() {
    this.containerEl = document.getElementById('connection-status') as HTMLElement;
    this.textEl = document.getElementById('status-text') as HTMLElement;
  }

  public setStatus(status: ConnectionStatus): void {
    this.containerEl.className = 'status-indicator';

    switch (status) {
      case 'connected':
        this.containerEl.classList.add('status-connected');
        this.textEl.textContent = 'Connected';
        break;
      case 'reconnecting':
        this.containerEl.classList.add('status-reconnecting');
        this.textEl.textContent = 'Reconnecting...';
        break;
      case 'disconnected':
      default:
        this.containerEl.classList.add('status-disconnected');
        this.textEl.textContent = 'Disconnected';
        break;
    }
  }
}
