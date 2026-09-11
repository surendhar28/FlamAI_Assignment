export interface ReplayBarCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onScrub: (index: number) => void;
  onSpeedChange: (speed: number) => void;
}

export class ReplayBar {
  private callbacks: ReplayBarCallbacks;
  private isPlaying: boolean = false;
  private speeds: number[] = [1, 2, 4];
  private currentSpeedIndex: number = 0;

  private btnPlay: HTMLButtonElement;
  private btnPause: HTMLButtonElement;
  private slider: HTMLInputElement;
  private counterText: HTMLElement;
  private btnSpeed: HTMLButtonElement;

  constructor(callbacks: ReplayBarCallbacks) {
    this.callbacks = callbacks;

    this.btnPlay = document.getElementById('btn-replay-play') as HTMLButtonElement;
    this.btnPause = document.getElementById('btn-replay-pause') as HTMLButtonElement;
    this.slider = document.getElementById('replay-slider') as HTMLInputElement;
    this.counterText = document.getElementById('replay-counter') as HTMLElement;
    this.btnSpeed = document.getElementById('btn-replay-speed') as HTMLButtonElement;

    this.initEventListeners();
  }

  private initEventListeners(): void {
    this.btnPlay.addEventListener('click', () => {
      this.isPlaying = true;
      this.callbacks.onPlay();
    });

    this.btnPause.addEventListener('click', () => {
      this.isPlaying = false;
      this.callbacks.onPause();
    });

    this.slider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const index = parseInt(target.value, 10);
      this.callbacks.onScrub(index);
    });

    this.btnSpeed.addEventListener('click', () => {
      this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speeds.length;
      const speed = this.speeds[this.currentSpeedIndex];
      this.btnSpeed.textContent = `${speed}x`;
      this.callbacks.onSpeedChange(speed);
    });
  }

  public updateRange(totalOps: number, currentOpIndex: number): void {
    this.slider.max = totalOps.toString();
    this.slider.value = currentOpIndex.toString();
    this.counterText.textContent = `${currentOpIndex} / ${totalOps}`;
  }

  public setPlayingState(playing: boolean): void {
    this.isPlaying = playing;
  }
}
