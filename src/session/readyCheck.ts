// Проверка на экране подготовки: все нужные точки видны PREPARE.visibleMs подряд.

import { PREPARE } from '../exercises/config';
import type { ExerciseBase, Landmark, Metrics } from '../exercises/types';
import { PoseTracker } from './poseTracker';

export interface ReadyState {
  visible: boolean; // тело видно целиком в этом кадре
  progress: number; // 0…1 — сколько из PREPARE.visibleMs уже видно подряд
  lost: boolean; // не видно дольше GENERAL.notVisibleMs
}

export class ReadyCheck<M extends Metrics> {
  private readonly tracker: PoseTracker<M>;
  private visibleSince: number | null = null;

  constructor(exercise: ExerciseBase<M>) {
    this.tracker = new PoseTracker(exercise);
  }

  update(landmarks: readonly Landmark[] | null, t: number, aspect: number): ReadyState {
    const { status } = this.tracker.track(landmarks, t, aspect);
    // Короткий пропуск кадра (status 'skipped') не сбрасывает отсчёт, но и не продвигает его.
    if (status === 'ok') this.visibleSince ??= t;
    else if (status === 'not_visible') this.visibleSince = null;

    const progress =
      this.visibleSince === null ? 0 : Math.min(1, (t - this.visibleSince) / PREPARE.visibleMs);
    return { visible: status === 'ok', progress, lost: status === 'not_visible' };
  }

  reset(): void {
    this.tracker.reset();
    this.visibleSince = null;
  }
}
