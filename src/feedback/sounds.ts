// Короткие звуковые сигналы через Web Audio: без файлов, работают офлайн.

export type SoundName = 'success' | 'fail' | 'tick' | 'start' | 'finish';

export interface SoundPlayer {
  play(name: SoundName): void;
}

// Нота: частота (Гц), начало и длительность (с) относительно момента воспроизведения.
type Note = [freq: number, start: number, duration: number];

const SOUNDS: Record<SoundName, { type: OscillatorType; notes: Note[]; volume: number }> = {
  success: { type: 'sine', notes: [[880, 0, 0.09], [1320, 0.08, 0.14]], volume: 0.35 },
  fail: { type: 'square', notes: [[220, 0, 0.12], [165, 0.13, 0.22]], volume: 0.15 },
  tick: { type: 'sine', notes: [[880, 0, 0.1]], volume: 0.3 },
  start: { type: 'sine', notes: [[1320, 0, 0.3]], volume: 0.35 },
  finish: { type: 'sine', notes: [[660, 0, 0.12], [880, 0.12, 0.12], [1320, 0.24, 0.3]], volume: 0.35 },
};

export class Sounds implements SoundPlayer {
  enabled = true;
  private ctx: AudioContext | null = null;

  // Браузеры разрешают звук только после нажатия пользователя. Вызывать по кнопке «Начать».
  unlock(): void {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
    } catch {
      // Web Audio недоступен — просто без звука.
    }
  }

  play(name: SoundName): void {
    if (!this.enabled || !this.ctx) return;
    const { type, notes, volume } = SOUNDS[name];
    const now = this.ctx.currentTime;
    for (const [freq, start, duration] of notes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      // Плавные атака и затухание, чтобы не было щелчков.
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(volume, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    }
  }
}
