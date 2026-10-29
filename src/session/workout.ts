// Один подход: упражнение на повторения или на время, пауза, подсказки и итог.
// Без React — экран только показывает WorkoutView.

import type { AnyExercise, Landmark } from '../exercises/types';
import { HoldRunner } from './holdRunner';
import type { HoldEnd } from './holdTimer';
import type { ReasonStat } from './repCounter';
import { RepRunner } from './repRunner';

const REP_MESSAGE_MS = 1500; // сколько показывать «Засчитано» / причину после повторения
const MAX_FRAME_GAP_MS = 1000; // больший промежуток между кадрами в общее время не идёт

export type Tone = 'ok' | 'error' | 'info';

export interface WorkoutView {
  counted: number; // повторения
  failed: number;
  seconds: number; // чистое время планки
  violations: number;
  hint: string;
  tone: Tone;
  paused: boolean;
  finished: boolean;
}

export interface WorkoutResult {
  title: string;
  mode: 'reps' | 'hold';
  target: number; // повторений или секунд
  counted: number;
  failed: number;
  cleanSec: number;
  violations: number;
  endedBy: HoldEnd | 'stopped' | null; // для планки
  reasons: { reason: string; count: number }[];
  totalMs: number; // общее время без пауз
}

// События для голоса и звука. Экран их не показывает — это делает Coach.
export type WorkoutEvent =
  | { type: 'rep'; counted: boolean; number: number; hint: string } // number — сколько засчитано
  | { type: 'hint'; text: string } // подсказку пора озвучить (появилась или сменилась)
  | { type: 'seconds'; seconds: number } // планка: прошли очередные 10 с чистого времени
  | { type: 'finished'; success: boolean; text: string };

export interface WorkoutUpdate {
  view: WorkoutView;
  errorPoints: ReadonlySet<number>;
  events: WorkoutEvent[];
}

const SECONDS_ANNOUNCE_EVERY = 10;
const START_HINT_DELAY_MS = 2000;
const NO_POINTS: ReadonlySet<number> = new Set();

interface FrameOutcome {
  view: WorkoutView;
  errorPoints: ReadonlySet<number>;
  voiceHint: string; // подсказка для озвучки; '' — молчать
}

export class Workout {
  private readonly exercise: AnyExercise;
  private readonly target: number;
  private readonly rep: RepRunner<Record<string, number>> | null = null;
  private readonly hold: HoldRunner<Record<string, number>> | null = null;
  private lastRep: { hint: string; tone: Tone; until: number } | null = null;
  private lastT: number | null = null;
  private totalMs = 0;
  private paused = false;
  private events: WorkoutEvent[] = [];
  private lastVoiceHint = '';
  private startedAt: number | null = null;
  private lastAnnouncedSec = 0;
  private finishAnnounced = false;

  constructor(exercise: AnyExercise, target: number) {
    this.exercise = exercise;
    this.target = target;
    if (exercise.mode === 'reps') this.rep = new RepRunner(exercise);
    else this.hold = new HoldRunner(exercise, target * 1000);
  }

  get finished(): boolean {
    if (this.rep) return this.rep.counter.counted >= this.target;
    return this.hold!.timer.state === 'finished';
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  update(landmarks: readonly Landmark[] | null, t: number, aspect: number): WorkoutUpdate {
    if (this.lastT !== null && !this.paused && !this.finished) {
      this.totalMs += Math.min(t - this.lastT, MAX_FRAME_GAP_MS);
    }
    this.lastT = t;

    let outcome: FrameOutcome;
    if (this.paused) {
      this.hold?.timer.skip(t);
      outcome = { view: this.view('Пауза', 'info'), errorPoints: NO_POINTS, voiceHint: '' };
    } else if (this.finished) {
      outcome = { view: this.finishedView(), errorPoints: NO_POINTS, voiceHint: '' };
    } else {
      outcome = this.rep ? this.updateReps(landmarks, t, aspect) : this.updateHold(landmarks, t, aspect);
    }

    // Подсказка озвучивается, когда появляется или меняется; повторы ограничивает Coach.
    // Подсказку исходного положения в первые секунды не озвучиваем: человек ещё
    // устраивается, и она перебила бы «Начали!».
    this.startedAt ??= t;
    if (outcome.voiceHint === this.exercise.startHint && t - this.startedAt < START_HINT_DELAY_MS) {
      outcome.voiceHint = '';
    }
    if (outcome.voiceHint && outcome.voiceHint !== this.lastVoiceHint) {
      this.events.push({ type: 'hint', text: outcome.voiceHint });
    }
    this.lastVoiceHint = outcome.voiceHint;

    const seconds = outcome.view.seconds;
    if (this.hold && !this.finished && seconds >= this.lastAnnouncedSec + SECONDS_ANNOUNCE_EVERY) {
      this.lastAnnouncedSec = seconds - (seconds % SECONDS_ANNOUNCE_EVERY);
      this.events.push({ type: 'seconds', seconds: this.lastAnnouncedSec });
    }

    if (this.finished && !this.finishAnnounced) {
      this.finishAnnounced = true;
      const { hint, tone } = this.finishedView();
      this.events.push({ type: 'finished', success: tone === 'ok', text: hint });
    }

    const events = this.events;
    this.events = [];
    return { view: outcome.view, errorPoints: outcome.errorPoints, events };
  }

  result(): WorkoutResult {
    const reasons = [...(this.rep?.counter.reasons ?? this.hold!.timer.reasons).values()]
      .sort((a: ReasonStat, b: ReasonStat) => b.count - a.count)
      .map(({ error, count }) => ({ reason: error.reason, count }));
    const timer = this.hold?.timer;
    return {
      title: this.exercise.title,
      mode: this.exercise.mode,
      target: this.target,
      counted: this.rep?.counter.counted ?? 0,
      failed: this.rep?.counter.failed ?? 0,
      cleanSec: timer ? Math.floor(timer.cleanMs / 1000) : 0,
      violations: timer?.violations ?? 0,
      endedBy: timer ? (timer.endedBy ?? 'stopped') : null,
      reasons,
      totalMs: this.totalMs,
    };
  }

  private updateReps(landmarks: readonly Landmark[] | null, t: number, aspect: number): FrameOutcome {
    const runner = this.rep!;
    const frame = runner.update(landmarks, t, aspect);
    const { counter } = runner;

    if (frame.rep) {
      const { counted, errors } = frame.rep;
      this.lastRep = counted
        ? { hint: 'Засчитано', tone: 'ok', until: t + REP_MESSAGE_MS }
        : { hint: errors[0].hint, tone: 'error', until: t + REP_MESSAGE_MS };
      this.events.push({ type: 'rep', counted, number: counter.counted, hint: this.lastRep.hint });
    }
    if (this.finished) {
      return { view: this.finishedView(), errorPoints: frame.errorPoints, voiceHint: '' };
    }

    const inRep = counter.state === 'descending' || counter.state === 'bottom';
    let hint = '';
    let tone: Tone = 'info';
    let voiceHint = '';
    if (frame.status === 'not_visible') {
      hint = voiceHint = 'Тебя не видно';
    } else if (frame.status === 'not_in_position' || counter.state === 'waiting') {
      hint = voiceHint = this.exercise.startHint;
    } else if (inRep && frame.frameErrors.length > 0) {
      hint = voiceHint = frame.frameErrors[0].hint;
      tone = 'error';
    } else if (this.lastRep && t < this.lastRep.until) {
      // Результат повторения уже озвучен событием 'rep'.
      ({ hint, tone } = this.lastRep);
    }
    return { view: this.view(hint, tone), errorPoints: frame.errorPoints, voiceHint };
  }

  private updateHold(landmarks: readonly Landmark[] | null, t: number, aspect: number): FrameOutcome {
    const runner = this.hold!;
    const frame = runner.update(landmarks, t, aspect);
    if (this.finished) {
      return { view: this.finishedView(), errorPoints: frame.errorPoints, voiceHint: '' };
    }

    const { state } = runner.timer;
    let hint = '';
    let tone: Tone = 'info';
    let voiceHint = '';
    if (frame.status === 'not_visible') {
      hint = voiceHint = 'Тебя не видно';
    } else if (frame.frameErrors.length > 0) {
      hint = frame.frameErrors[0].hint;
      tone = 'error';
      // Нарушение короче секунды прощается — озвучиваем, только когда таймер встал.
      if (state === 'paused') voiceHint = hint;
    } else if (frame.status === 'not_in_position') {
      hint = this.exercise.startHint;
      if (state === 'waiting') voiceHint = hint;
    } else if (state === 'waiting') {
      hint = 'Держи…';
    }
    return { view: this.view(hint, tone), errorPoints: frame.errorPoints, voiceHint };
  }

  private finishedView(): WorkoutView {
    const endedBy = this.hold?.timer.endedBy;
    if (!this.hold || endedBy === 'target') return this.view('Готово!', 'ok');
    return this.view(
      endedBy === 'violation' ? 'Подход окончен: долгое нарушение' : 'Подход окончен',
      'error',
    );
  }

  private view(hint: string, tone: Tone): WorkoutView {
    const timer = this.hold?.timer;
    return {
      counted: this.rep?.counter.counted ?? 0,
      failed: this.rep?.counter.failed ?? 0,
      seconds: timer ? Math.floor(timer.cleanMs / 1000) : 0,
      violations: timer?.violations ?? 0,
      hint,
      tone,
      paused: this.paused,
      finished: this.finished,
    };
  }
}

export function sameView(a: WorkoutView, b: WorkoutView): boolean {
  return (
    a.counted === b.counted &&
    a.failed === b.failed &&
    a.seconds === b.seconds &&
    a.violations === b.violations &&
    a.hint === b.hint &&
    a.tone === b.tone &&
    a.paused === b.paused &&
    a.finished === b.finished
  );
}
