// Связывает кадры позы с упражнением на повторения: PoseTracker (сторона, видимость,
// сглаживание) + машина состояний. Без React.

import { GENERAL } from '../exercises/config';
import type { FormError, Landmark, Metrics, Phase, RepExercise } from '../exercises/types';
import type { Side } from '../pose/side';
import { PoseTracker } from './poseTracker';
import { RepCounter, type RepResult } from './repCounter';

export type RunnerStatus =
  | 'ok'
  | 'not_visible' // нужные точки не видны дольше GENERAL.notVisibleMs
  | 'not_in_position'; // человек не в исходной позе упражнения

export interface RunnerFrame<M extends Metrics> {
  status: RunnerStatus;
  side: Side | null;
  metrics: M | null; // сглаженные
  phase: Phase | null;
  frameErrors: FormError[];
  errorPoints: Set<number>; // индексы MediaPipe для красной подсветки
  rep: RepResult | null; // повторение, завершившееся на этом кадре
}

export class RepRunner<M extends Metrics> {
  readonly counter: RepCounter;
  private readonly exercise: RepExercise<M>;
  private readonly tracker: PoseTracker<M>;

  constructor(exercise: RepExercise<M>) {
    this.exercise = exercise;
    this.tracker = new PoseTracker(exercise);
    this.counter = new RepCounter({ minRepMs: GENERAL.minRepMs, ...exercise.repErrors });
  }

  update(landmarks: readonly Landmark[] | null, t: number, aspect: number): RunnerFrame<M> {
    const { status, side, metrics } = this.tracker.track(landmarks, t, aspect);
    const empty: RunnerFrame<M> = {
      status: status === 'not_visible' ? 'not_visible' : 'ok',
      side,
      metrics,
      phase: null,
      frameErrors: [],
      errorPoints: new Set(),
      rep: null,
    };
    // Пока нужные точки не видны, кадры в машину состояний не идут.
    if (!metrics) return empty;

    if (this.exercise.inPosition && !this.exercise.inPosition(metrics)) {
      this.counter.interrupt();
      return { ...empty, status: 'not_in_position' };
    }

    const phase = this.exercise.phase(metrics);
    const frameErrors = this.exercise.checkForm(metrics);
    const rep = this.counter.update(phase, frameErrors, t);
    const errorPoints = this.tracker.errorPoints(frameErrors);
    return { ...empty, phase, frameErrors, errorPoints, rep };
  }

  reset(): void {
    this.counter.reset();
    this.tracker.reset();
  }
}
