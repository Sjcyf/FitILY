import { describe, expect, it } from 'vitest';
import { SIDE_POINTS } from '../pose/side';
import { createPushup, type PushupMetrics } from './pushup';
import type { Landmark } from './types';

const base: PushupMetrics = { elbow: 170, bodyLine: 175, hipOffset: 0, knee: 175, bodyIncline: 10 };
const codes = (m: { bodyLine?: number; hipOffset?: number; knee?: number }) =>
  createPushup('normal')
    .checkForm({ ...base, ...m })
    .map((e) => e.code);

describe('pushup: phase', () => {
  const pushup = createPushup('normal');
  it.each([
    [170, 'up'],
    [150, 'top'],
    [110, 'between'],
    [80, 'down'],
  ] as const)('локоть %d° → %s', (elbow, phase) => {
    expect(pushup.phase({ ...base, elbow })).toBe(phase);
  });
});

describe('pushup: checkForm', () => {
  it('ровное тело — без ошибок', () => {
    expect(codes({})).toEqual([]);
  });

  it('таз ниже линии — «Таз провис»', () => {
    expect(codes({ bodyLine: 150, hipOffset: 0.08 })).toEqual(['sag']);
  });

  it('таз выше линии — «Таз задран»', () => {
    expect(codes({ bodyLine: 150, hipOffset: -0.08 })).toEqual(['pike']);
  });

  it('согнутые колени', () => {
    expect(codes({ knee: 120 })).toEqual(['knees']);
  });
});

describe('pushup: inPosition', () => {
  const pushup = createPushup('normal');
  it('в упоре лёжа — да, стоя — нет', () => {
    expect(pushup.inPosition!({ ...base, bodyIncline: 15 })).toBe(true);
    expect(pushup.inPosition!({ ...base, bodyIncline: 80 })).toBe(false);
  });
});

describe('pushup: computeMetrics', () => {
  // Человек в упоре головой вправо, левая сторона к камере. Кадр 16:9.
  const ASPECT = 16 / 9;
  function lying(hipY: number): Landmark[] {
    const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
    const s = SIDE_POINTS.left;
    const set = (i: number, x: number, y: number) => (lms[i] = { x: x / ASPECT, y, visibility: 0.9 });
    set(s.ankle, 0.3, 0.8);
    set(s.knee, 0.6, 0.75);
    set(s.hip, 0.9, hipY);
    set(s.shoulder, 1.4, 0.6);
    set(s.elbow, 1.4, 0.7);
    set(s.wrist, 1.4, 0.8);
    return lms;
  }

  it('прямое тело: линия ≈ 180°, таз на линии, тело почти горизонтально', () => {
    const m = createPushup('normal').computeMetrics(lying(0.7), 'left', ASPECT);
    expect(m.bodyLine).toBeGreaterThan(178);
    expect(Math.abs(m.hipOffset)).toBeLessThan(0.01);
    expect(m.bodyIncline).toBeLessThan(20);
    expect(m.elbow).toBeCloseTo(180);
  });

  it('провисший таз — положительное смещение', () => {
    const m = createPushup('normal').computeMetrics(lying(0.8), 'left', ASPECT);
    expect(m.hipOffset).toBeGreaterThan(0);
    expect(m.bodyLine).toBeLessThan(170);
  });

  it('задранный таз — отрицательное смещение', () => {
    expect(createPushup('normal').computeMetrics(lying(0.55), 'left', ASPECT).hipOffset).toBeLessThan(0);
  });
});
