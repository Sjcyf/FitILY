// Общая для всех упражнений обработка кадра: выбор стороны, проверка видимости
// нужных точек, расчёт и сглаживание метрик. Без React.

import { GENERAL } from '../exercises/config';
import type { ExerciseBase, FormError, Landmark, Metrics } from '../exercises/types';
import { MetricsSmoother, MovingAverage } from '../pose/smoothing';
import { SIDE_POINTS, chooseSide, type Side } from '../pose/side';

export interface Tracked<M extends Metrics> {
  // ok      — метрики посчитаны;
  // skipped — кадр пропущен (точки не видны, но меньше GENERAL.notVisibleMs, или метрики не посчитались);
  // not_visible — нужные точки не видны дольше GENERAL.notVisibleMs: пауза «Тебя не видно».
  status: 'ok' | 'skipped' | 'not_visible';
  side: Side | null;
  metrics: M | null; // сглаженные
}

export class PoseTracker<M extends Metrics> {
  private readonly exercise: ExerciseBase<M>;
  private smoother = new MetricsSmoother<string>(() => new MovingAverage(GENERAL.smoothingWindow));
  private side: Side | undefined;
  private hiddenSince: number | null = null;

  constructor(exercise: ExerciseBase<M>) {
    this.exercise = exercise;
  }

  track(landmarks: readonly Landmark[] | null, t: number, aspect: number): Tracked<M> {
    if (landmarks) {
      const side = chooseSide(landmarks, this.side, GENERAL.sideSwitchMargin);
      if (side !== this.side) this.smoother.reset();
      this.side = side;
    }
    const side = this.side ?? null;

    if (!landmarks || !this.side || !this.requiredVisible(landmarks, this.side)) {
      this.hiddenSince ??= t;
      const status = t - this.hiddenSince > GENERAL.notVisibleMs ? 'not_visible' : 'skipped';
      return { status, side, metrics: null };
    }
    this.hiddenSince = null;

    const raw = this.exercise.computeMetrics(landmarks, this.side, aspect);
    if (Object.values(raw).some((v) => !Number.isFinite(v))) {
      return { status: 'skipped', side, metrics: null };
    }
    return { status: 'ok', side, metrics: this.smoother.next(raw, t) as M };
  }

  // Индексы MediaPipe суставов с ошибкой — для красной подсветки скелета.
  errorPoints(errors: readonly FormError[]): Set<number> {
    const result = new Set<number>();
    if (!this.side) return result;
    const points = SIDE_POINTS[this.side];
    for (const e of errors) for (const name of e.points) result.add(points[name]);
    return result;
  }

  reset(): void {
    this.smoother.reset();
    this.side = undefined;
    this.hiddenSince = null;
  }

  private requiredVisible(landmarks: readonly Landmark[], side: Side): boolean {
    const points = SIDE_POINTS[side];
    return this.exercise.requiredPoints.every(
      (name) => (landmarks[points[name]]?.visibility ?? 0) >= GENERAL.minVisibility,
    );
  }
}
