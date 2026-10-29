// Выбор стороны тела, которая лучше видна камере (камера стоит сбоку).

export type Side = 'left' | 'right';

export interface SidePoints {
  shoulder: number;
  elbow: number;
  wrist: number;
  hip: number;
  knee: number;
  ankle: number;
  heel: number;
  footIndex: number; // носок
}

// Индексы MediaPipe Pose.
export const SIDE_POINTS: Record<Side, SidePoints> = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, heel: 29, footIndex: 31 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, heel: 30, footIndex: 32 },
};

export interface VisibilityLike {
  visibility?: number;
}

export function sideVisibility(landmarks: readonly VisibilityLike[], side: Side): number {
  const indices = Object.values(SIDE_POINTS[side]);
  const sum = indices.reduce((s, i) => s + (landmarks[i]?.visibility ?? 0), 0);
  return sum / indices.length;
}

// Сторона с большей средней visibility. Чтобы сторона не прыгала туда-сюда,
// когда видимость почти равна, смена происходит только при перевесе больше `margin`.
export function chooseSide(
  landmarks: readonly VisibilityLike[],
  previous?: Side,
  margin = 0.1,
): Side {
  const left = sideVisibility(landmarks, 'left');
  const right = sideVisibility(landmarks, 'right');
  if (previous === 'left' && right - left <= margin) return 'left';
  if (previous === 'right' && left - right <= margin) return 'right';
  return left >= right ? 'left' : 'right';
}
