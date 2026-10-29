// Таймер для упражнений на время (планка): идёт, только пока поза правильная.
//
//   waiting  — ждём правильную позу; старт, когда она держится startMs подряд
//              (эта секунда засчитывается в чистое время);
//   running  — таймер идёт; нарушение короче graceMs прощается;
//   paused   — нарушение длится дольше graceMs: таймер стоит;
//   finished — цель достигнута, нарушение дольше maxViolationMs или человек вышел из позы
//              (встал или лёг) дольше graceMs.

import type { FormError } from '../exercises/types';
import type { ReasonStat } from './repCounter';

export type HoldState = 'waiting' | 'running' | 'paused' | 'finished';
export type HoldEnd = 'target' | 'violation' | 'left_position';

export interface HoldTimerOptions {
  targetMs: number;
  startMs: number;
  graceMs: number;
  maxViolationMs: number;
  maxFrameGapMs: number;
}

export class HoldTimer {
  state: HoldState = 'waiting';
  cleanMs = 0; // чистое время в правильной позе
  violations = 0; // нарушения дольше graceMs
  readonly reasons = new Map<string, ReasonStat>();
  endedBy: HoldEnd | null = null;
  startedAt: number | null = null;
  endedAt: number | null = null;

  private readonly options: HoldTimerOptions;
  private lastT: number | null = null;
  private goodSince: number | null = null;
  private badSince: number | null = null; // начало текущего нарушения
  private outSince: number | null = null; // начало выхода из позы
  private badErrors = new Map<string, FormError>();
  private tentativeMs = 0; // время, засчитанное за текущее нарушение, пока оно прощается

  constructor(options: HoldTimerOptions) {
    this.options = options;
  }

  // inPosition — человек в позе упражнения (горизонтально, с упором на руки);
  // errors — нарушения техники в этом кадре.
  update(inPosition: boolean, errors: readonly FormError[], t: number): void {
    if (this.state === 'finished') return;
    const dt = this.lastT === null ? 0 : Math.min(t - this.lastT, this.options.maxFrameGapMs);
    this.lastT = t;
    const ok = inPosition && errors.length === 0;

    if (this.state === 'waiting') {
      if (!ok) {
        this.goodSince = null;
        return;
      }
      this.goodSince ??= t;
      if (t - this.goodSince >= this.options.startMs) {
        this.state = 'running';
        this.startedAt = this.goodSince;
        this.cleanMs = t - this.goodSince;
        this.checkTarget(t);
      }
      return;
    }

    if (ok) {
      if (this.state === 'paused') this.state = 'running';
      else this.cleanMs += dt;
      this.badSince = null;
      this.outSince = null;
      this.tentativeMs = 0;
      this.checkTarget(t);
      return;
    }

    // Нарушение.
    if (this.badSince === null) {
      this.badSince = t;
      this.badErrors.clear();
    }
    for (const e of errors) this.badErrors.set(e.code, e);
    if (inPosition) this.outSince = null;
    else this.outSince ??= t;

    if (this.outSince !== null && t - this.outSince > this.options.graceMs) {
      this.cleanMs -= this.tentativeMs;
      this.finish('left_position', t);
      return;
    }

    const badMs = t - this.badSince;
    if (this.state === 'running') {
      if (badMs < this.options.graceMs) {
        this.cleanMs += dt;
        this.tentativeMs += dt;
        this.checkTarget(t);
      } else {
        // Нарушение не простилось: его время не засчитывается.
        this.cleanMs -= this.tentativeMs;
        this.tentativeMs = 0;
        this.state = 'paused';
        this.violations++;
        for (const error of this.badErrors.values()) {
          const stat = this.reasons.get(error.code);
          if (stat) stat.count++;
          else this.reasons.set(error.code, { error, count: 1 });
        }
      }
    } else if (badMs > this.options.maxViolationMs) {
      this.finish('violation', t);
    }
  }

  // Кадр без данных (человек не виден): время не идёт, отсчёты нарушений сдвигаются.
  skip(t: number): void {
    if (this.lastT !== null) {
      const gap = t - this.lastT;
      if (this.goodSince !== null) this.goodSince += gap;
      if (this.badSince !== null) this.badSince += gap;
      if (this.outSince !== null) this.outSince += gap;
    }
    this.lastT = t;
  }

  reset(): void {
    this.state = 'waiting';
    this.cleanMs = 0;
    this.violations = 0;
    this.reasons.clear();
    this.endedBy = null;
    this.startedAt = null;
    this.endedAt = null;
    this.lastT = null;
    this.goodSince = null;
    this.badSince = null;
    this.outSince = null;
    this.badErrors.clear();
    this.tentativeMs = 0;
  }

  private checkTarget(t: number): void {
    if (this.cleanMs >= this.options.targetMs) {
      this.cleanMs = this.options.targetMs;
      this.finish('target', t);
    }
  }

  private finish(reason: HoldEnd, t: number): void {
    this.state = 'finished';
    this.endedBy = reason;
    this.endedAt = t;
  }
}
