// Превращает события подхода в голос и звук. Без React.

import type { WorkoutEvent } from '../session/workout';
import type { SoundPlayer } from './sounds';
import type { Speaker } from './voice';

// Одна и та же подсказка — не чаще раза в столько миллисекунд.
export const HINT_REPEAT_MS = 3000;

export class Coach {
  private readonly voice: Speaker;
  private readonly sounds: SoundPlayer;
  private lastSaid = new Map<string, number>();

  constructor(voice: Speaker, sounds: SoundPlayer) {
    this.voice = voice;
    this.sounds = sounds;
  }

  countdown(n: number): void {
    this.sounds.play('tick');
    this.voice.say(String(n));
  }

  start(): void {
    this.sounds.play('start');
    this.voice.say('Начали!');
  }

  // Все события одного кадра озвучиваются одной фразой: иначе следующая фраза
  // прервала бы предыдущую (например, «10» и «Готово!» на последнем повторении).
  handle(events: readonly WorkoutEvent[], t: number): void {
    const phrases: string[] = [];
    for (const e of events) {
      switch (e.type) {
        case 'rep':
          if (e.counted) {
            this.sounds.play('success');
            phrases.push(String(e.number));
          } else {
            this.sounds.play('fail');
            if (this.allowed(e.hint, t)) phrases.push(e.hint);
          }
          break;
        case 'hint':
          if (this.allowed(e.text, t)) phrases.push(e.text);
          break;
        case 'seconds':
          phrases.push(`${e.seconds} секунд`);
          break;
        case 'finished':
          this.sounds.play(e.success ? 'finish' : 'fail');
          phrases.push(e.text);
          break;
      }
    }
    if (phrases.length > 0) this.voice.say(phrases.join('. '));
  }

  private allowed(text: string, t: number): boolean {
    const last = this.lastSaid.get(text);
    if (last !== undefined && t - last < HINT_REPEAT_MS) return false;
    this.lastSaid.set(text, t);
    return true;
  }
}
