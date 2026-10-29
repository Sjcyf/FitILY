// Общие на всё приложение голос и звук: включаются один раз по нажатию «Начать».

import { Sounds } from './sounds';
import { Voice } from './voice';

export const voice = new Voice();
export const sounds = new Sounds();

const STORAGE_KEY = 'fitily.sound';

export function loadSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  voice.enabled = enabled;
  sounds.enabled = enabled;
  if (!enabled) voice.stop();
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Не критично.
  }
}

// Вызывать из обработчика нажатия: браузеры разрешают звук и речь только после жеста.
export function unlockAudio(): void {
  sounds.unlock();
  voice.unlock();
}
