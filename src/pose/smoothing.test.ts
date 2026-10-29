import { describe, expect, it } from 'vitest';
import { MetricsSmoother, MovingAverage, OneEuroFilter } from './smoothing';

describe('MovingAverage', () => {
  it('среднее по последним 5 значениям', () => {
    const f = new MovingAverage(5);
    [10, 20, 30, 40, 50].forEach((v) => f.next(v));
    expect(f.next(60)).toBeCloseTo(40); // 20..60
  });

  it('пропускает NaN', () => {
    const f = new MovingAverage(5);
    f.next(10);
    expect(f.next(NaN)).toBeCloseTo(10);
  });
});

describe('OneEuroFilter', () => {
  it('гасит дрожание вокруг постоянного значения', () => {
    const f = new OneEuroFilter();
    let out = 0;
    for (let i = 0; i < 60; i++) out = f.next(90 + (i % 2 === 0 ? 3 : -3), i * 33);
    expect(Math.abs(out - 90)).toBeLessThan(2);
  });

  it('догоняет резкое изменение', () => {
    const f = new OneEuroFilter();
    for (let i = 0; i < 30; i++) f.next(170, i * 33);
    let out = 0;
    for (let i = 30; i < 45; i++) out = f.next(80, i * 33);
    expect(out).toBeLessThan(90);
  });
});

describe('MetricsSmoother', () => {
  it('сглаживает каждый ключ отдельно', () => {
    const s = new MetricsSmoother<'a' | 'b'>(() => new MovingAverage(2));
    s.next({ a: 0, b: 100 }, 0);
    expect(s.next({ a: 10, b: 200 }, 33)).toEqual({ a: 5, b: 150 });
  });
});
