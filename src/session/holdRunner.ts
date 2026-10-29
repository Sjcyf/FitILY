// Связывает кадры позы с упражнением на время: PoseTracker + HoldTimer. Без React.

import { HOLD } from '../exercises/config';
import type { FormError, HoldExercise, Landmark, Metrics } from '../exercises/types';
import { HoldTimer } from './holdTimer';
import { PoseTracker } from './poseTracker';
import type { RunnerStatus } from './repRunner';

export interface HoldRunnerFrame<M extends Metrics> {
  status: RunnerStatus;
  metrics: M | null;
  frameErrors: FormError[];
  errorPoints: Set<number>;
}

export class HoldRunner<M extends Metrics> {
  readonly timer: HoldTimer;
  private readonly exercise: HoldExercise<M>;
  private readonly tracker: PoseTracker<M>;

  constructor(exercise: HoldExercise<M>, targetMs: number) {
    this.exercise = exercise;
    this.tracker = new PoseTracker(exercise);
    this.timer = new HoldTimer({ targetMs, ...HOLD });
  }

  update(landmarks: readonly Landmark[] | null, t: number, aspect: number): HoldRunnerFrame<M> {
    const { status, metrics } = this.tracker.track(landmarks, t, aspect);
    const empty: HoldRunnerFrame<M> = {
      status: status === 'not_visible' ? 'not_visible' : 'ok',
      metrics,
      frameErrors: [],
      errorPoints: new Set(),
    };
    if (status === 'not_visible') this.timer.skip(t);
    if (!metrics) return empty;

    const inPosition = this.exercise.inPosition(metrics);
    const frameErrors = inPosition ? this.exercise.checkForm(metrics) : [];
    this.timer.update(inPosition, frameErrors, t);
    return {
      ...empty,
      status: inPosition ? 'ok' : 'not_in_position',
      frameErrors,
      errorPoints: this.tracker.errorPoints(frameErrors),
    };
  }

  reset(): void {
    this.timer.reset();
    this.tracker.reset();
  }
}
