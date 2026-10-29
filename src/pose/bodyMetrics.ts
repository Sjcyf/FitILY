// Базовые углы и наклоны тела для выбранной стороны. Их используют экран отладки
// и упражнения.

import {
  angle,
  distance,
  inclineToHorizontal,
  inclineToVertical,
  toPoint,
  verticalOffsetFromLine,
  type LandmarkLike,
} from './geometry';
import { SIDE_POINTS, type Side } from './side';

export interface BodyMetrics {
  elbow: number; // плечо–локоть–запястье
  knee: number; // таз–колено–щиколотка
  hip: number; // плечо–таз–колено
  bodyLine: number; // плечо–таз–щиколотка (прямое тело ≈ 180°)
  torsoToHorizontal: number; // плечо–таз
  torsoToVertical: number;
  bodyToHorizontal: number; // плечо–щиколотка
  hipOffset: number; // таз ниже (> 0) / выше (< 0) линии плечо–щиколотка, доля её длины
}

export type BodyMetricKey = keyof BodyMetrics;

export function computeBodyMetrics(
  landmarks: readonly LandmarkLike[],
  side: Side,
  aspect: number,
): BodyMetrics {
  const s = SIDE_POINTS[side];
  const p = (i: number) => toPoint(landmarks[i], aspect);
  const shoulder = p(s.shoulder);
  const elbow = p(s.elbow);
  const wrist = p(s.wrist);
  const hip = p(s.hip);
  const knee = p(s.knee);
  const ankle = p(s.ankle);

  return {
    elbow: angle(shoulder, elbow, wrist),
    knee: angle(hip, knee, ankle),
    hip: angle(shoulder, hip, knee),
    bodyLine: angle(shoulder, hip, ankle),
    torsoToHorizontal: inclineToHorizontal(shoulder, hip),
    torsoToVertical: inclineToVertical(shoulder, hip),
    bodyToHorizontal: inclineToHorizontal(shoulder, ankle),
    hipOffset: verticalOffsetFromLine(hip, shoulder, ankle) / distance(shoulder, ankle),
  };
}
