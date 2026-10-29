// Геометрия по точкам позы. Все углы — в градусах.
//
// MediaPipe отдаёт координаты, нормализованные отдельно по ширине и высоте кадра,
// поэтому перед расчётом углов x домножается на соотношение сторон (toPoint),
// иначе на кадре 16:9 углы будут искажены. Ось y направлена вниз, как на экране.

export interface Point {
  x: number;
  y: number;
}

export interface LandmarkLike {
  x: number;
  y: number;
}

const RAD_TO_DEG = 180 / Math.PI;

// aspect = ширина кадра / высота кадра.
export function toPoint(lm: LandmarkLike, aspect: number): Point {
  return { x: lm.x * aspect, y: lm.y };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Угол A–B–C с вершиной в B, 0…180°. NaN, если A или C совпадает с B.
export function angle(a: Point, b: Point, c: Point): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const lengths = Math.hypot(bax, bay) * Math.hypot(bcx, bcy);
  if (lengths === 0) return NaN;
  const cos = (bax * bcx + bay * bcy) / lengths;
  // Погрешность float может дать |cos| чуть больше 1.
  return Math.acos(Math.min(1, Math.max(-1, cos))) * RAD_TO_DEG;
}

// Наклон линии A–B к горизонту, 0…90°, направление линии не важно.
export function inclineToHorizontal(a: Point, b: Point): number {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  if (dx === 0 && dy === 0) return NaN;
  return Math.atan2(dy, dx) * RAD_TO_DEG;
}

// Наклон линии A–B к вертикали, 0…90°.
export function inclineToVertical(a: Point, b: Point): number {
  return 90 - inclineToHorizontal(a, b);
}

// Насколько точка P ниже (> 0) или выше (< 0) прямой A–B, по вертикали.
// Нужно для «таз провис / таз задран». NaN, если прямая вертикальна.
export function verticalOffsetFromLine(p: Point, a: Point, b: Point): number {
  if (a.x === b.x) return NaN;
  const t = (p.x - a.x) / (b.x - a.x);
  const lineY = a.y + t * (b.y - a.y);
  return p.y - lineY;
}
