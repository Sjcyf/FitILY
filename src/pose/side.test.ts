import { describe, expect, it } from 'vitest';
import { SIDE_POINTS, chooseSide, type Side } from './side';

function landmarks(left: number, right: number) {
  const lms = Array.from({ length: 33 }, () => ({ visibility: 0 }));
  const set = (side: Side, v: number) =>
    Object.values(SIDE_POINTS[side]).forEach((i) => (lms[i] = { visibility: v }));
  set('left', left);
  set('right', right);
  return lms;
}

describe('chooseSide', () => {
  it('выбирает сторону с большей видимостью', () => {
    expect(chooseSide(landmarks(0.9, 0.3))).toBe('left');
    expect(chooseSide(landmarks(0.3, 0.9))).toBe('right');
  });

  it('не меняет сторону при небольшом перевесе', () => {
    expect(chooseSide(landmarks(0.8, 0.85), 'left')).toBe('left');
  });

  it('меняет сторону при явном перевесе', () => {
    expect(chooseSide(landmarks(0.5, 0.9), 'left')).toBe('right');
  });
});
