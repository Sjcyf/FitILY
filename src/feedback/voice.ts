// Озвучка на русском через Web Speech API (speechSynthesis).

export interface Speaker {
  // Говорит фразу, прерывая предыдущую: актуальна только последняя подсказка.
  say(text: string): void;
}

export class Voice implements Speaker {
  enabled = true;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (!('speechSynthesis' in window)) return;
    this.pickVoice();
    // В Chrome список голосов приходит асинхронно.
    speechSynthesis.addEventListener?.('voiceschanged', () => this.pickVoice());
  }

  // iOS Safari озвучивает только после того, как речь хоть раз запустили из обработчика
  // нажатия. Вызывать по кнопке «Начать».
  unlock(): void {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  }

  say(text: string): void {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    if (this.voice) u.voice = this.voice;
    u.rate = 1.1;
    speechSynthesis.speak(u);
  }

  stop(): void {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  private pickVoice(): void {
    const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ru'));
    // Локальные голоса работают без интернета, поэтому они в приоритете.
    this.voice = voices.find((v) => v.localService) ?? voices[0] ?? null;
  }
}
