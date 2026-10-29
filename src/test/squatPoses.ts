// Синтетические кадры приседаний для тестов.
// Человек боком к камере, правая сторона видна. Кадр 16:9.
// Бедро и голень по 0,2 высоты кадра; колено выводится вперёд при сгибании.

import type { Landmark } from '../exercises/types';
import { SIDE_POINTS } from '../pose/side';

export const ASPECT = 16 / 9;

export function squatPose(kneeDeg: number): Landmark[] {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
  const s = SIDE_POINTS.right;
  const ankle = { x: 0.5 * ASPECT, y: 0.9 };
  const half = ((180 - kneeDeg) / 2) * (Math.PI / 180);
  const knee = { x: ankle.x + 0.2 * Math.sin(half), y: ankle.y - 0.2 * Math.cos(half) };
  const hip = { x: knee.x - 0.2 * Math.sin(half), y: knee.y - 0.2 * Math.cos(half) };
  const shoulder = { x: hip.x + 0.05, y: hip.y - 0.3 };
  const set = (i: number, p: { x: number; y: number }) =>
    (lms[i] = { x: p.x / ASPECT, y: p.y, visibility: 0.95 });
  set(s.ankle, ankle);
  set(s.knee, knee);
  set(s.hip, hip);
  set(s.shoulder, shoulder);
  set(s.heel, { x: ankle.x - 0.03, y: 0.92 });
  set(s.footIndex, { x: ankle.x + 0.08, y: 0.92 });
  return lms;
}

// Косинусная траектория угла колена за одно приседание: 175° → depth → 175°.
export function squatFrames(depth: number, frames = 20): number[] {
  return Array.from({ length: frames }, (_, i) => {
    const k = (1 - Math.cos((2 * Math.PI * i) / (frames - 1))) / 2;
    return 175 - (175 - depth) * k;
  });
}
