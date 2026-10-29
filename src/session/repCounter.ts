// Машина состояний «верх → низ → верх», общая для отжиманий, приседаний и пресса.
//
//   waiting    — ещё ни разу не был в исходном положении (только встал в кадр);
//   ready      — ГОТОВ, в исходном положении;
//   descending — ВНИЗ, движение началось;
//   bottom     — НИЗ_ДОСТИГНУТ; при возврате в «up» повторение завершается.
//
// Пока идёт повторение, нарушения техники копятся во флагах. В конце: нет флагов —
// засчитано, есть — не засчитано, причины идут в статистику.

import type { FormError, Phase } from '../exercises/types';

export type RepState = 'waiting' | 'ready' | 'descending' | 'bottom';

export interface RepResult {
  counted: boolean;
  errors: FormError[];
  durationMs: number;
  endedAt: number;
}

export interface RepCounterOptions {
  minRepMs: number;
  incompleteDepth: FormError;
  incompleteTop: FormError;
}

export const TOO_FAST: FormError = {
  code: 'too_fast',
  hint: 'Медленнее',
  reason: 'Слишком быстро',
  points: [],
};

export interface ReasonStat {
  error: FormError;
  count: number;
}

export class RepCounter {
  state: RepState = 'waiting';
  counted = 0;
  failed = 0;
  // Причины незасчитанных повторений: code → сколько раз.
  readonly reasons = new Map<string, ReasonStat>();

  private readonly options: RepCounterOptions;
  private repStart = 0;
  private flags = new Map<string, FormError>();
  private rose = false; // из «низа» поднялся до зоны «top», но не до «up»

  constructor(options: RepCounterOptions) {
    this.options = options;
  }

  update(phase: Phase, errors: readonly FormError[], t: number): RepResult | null {
    switch (this.state) {
      case 'waiting':
        if (phase === 'up') this.state = 'ready';
        return null;

      case 'ready':
        if (phase === 'between' || phase === 'down') this.begin(phase, errors, t);
        return null;

      case 'descending':
        if (phase === 'up') return this.finish(t, [this.options.incompleteDepth]);
        this.collect(errors);
        if (phase === 'down') this.state = 'bottom';
        return null;

      case 'bottom':
        if (phase === 'up') return this.finish(t, []);
        if (phase === 'top') {
          this.rose = true;
        } else if (this.rose) {
          // Не выпрямился до конца и пошёл на следующее повторение.
          const result = this.finish(t, [this.options.incompleteTop]);
          this.begin(phase, errors, t);
          return result;
        }
        this.collect(errors);
        return null;
    }
  }

  // Человек вышел из исходной позы (встал из упора): незаконченное повторение
  // отбрасывается без оценки, счёт сохраняется, ждём возврата в исходное положение.
  interrupt(): void {
    this.state = 'waiting';
    this.flags.clear();
    this.rose = false;
  }

  reset(): void {
    this.state = 'waiting';
    this.counted = 0;
    this.failed = 0;
    this.reasons.clear();
    this.flags.clear();
    this.rose = false;
  }

  private begin(phase: Phase, errors: readonly FormError[], t: number): void {
    this.repStart = t;
    this.flags.clear();
    this.rose = false;
    this.collect(errors);
    this.state = phase === 'down' ? 'bottom' : 'descending';
  }

  private collect(errors: readonly FormError[]): void {
    for (const e of errors) this.flags.set(e.code, e);
  }

  private finish(t: number, extra: FormError[]): RepResult {
    const durationMs = t - this.repStart;
    const errors = [...extra, ...this.flags.values()];
    // «Слишком быстро» — защита от рывков и сбоев. Если повторение уже не засчитано
    // по другой причине, эта лишь засоряла бы статистику.
    if (errors.length === 0 && durationMs < this.options.minRepMs) errors.push(TOO_FAST);
    const counted = errors.length === 0;

    if (counted) {
      this.counted++;
    } else {
      this.failed++;
      for (const error of errors) {
        const stat = this.reasons.get(error.code);
        if (stat) stat.count++;
        else this.reasons.set(error.code, { error, count: 1 });
      }
    }

    this.state = 'ready';
    this.flags.clear();
    this.rose = false;
    return { counted, errors, durationMs, endedAt: t };
  }
}
