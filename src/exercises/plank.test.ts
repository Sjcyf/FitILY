import { describe, expect, it } from 'vitest';
import { createPlank, type PlankMetrics } from './plank';

const base: PlankMetrics = { bodyLine: 175, hipOffset: 0, elbow: 90, bodyIncline: 12, armToVertical: 10 };
const codes = (m: { bodyLine?: number; hipOffset?: number; elbow?: number }, arms?: 'straight') =>
  createPlank('normal', arms)
    .checkForm({ ...base, ...m })
    .map((e) => e.code);

describe('plank: checkForm', () => {
  it('правильная планка на предплечьях — без ошибок', () => {
    expect(codes({})).toEqual([]);
  });

  it('таз провис / задран', () => {
    expect(codes({ bodyLine: 150, hipOffset: 0.08 })).toEqual(['sag']);
    expect(codes({ bodyLine: 150, hipOffset: -0.08 })).toEqual(['pike']);
  });

  it('локти не под плечами', () => {
    expect(codes({ elbow: 130 })).toEqual(['elbows']);
    expect(codes({ elbow: 60 })).toEqual(['elbows']);
  });

  it('вариант на прямых руках', () => {
    expect(codes({ elbow: 170 }, 'straight')).toEqual([]);
    expect(codes({ elbow: 120 }, 'straight')).toEqual(['arms']);
  });
});

describe('plank: inPosition', () => {
  const plank = createPlank('normal');
  it('в планке', () => {
    expect(plank.inPosition(base)).toBe(true);
  });

  it('встал — тело не горизонтально', () => {
    expect(plank.inPosition({ ...base, bodyIncline: 70 })).toBe(false);
  });

  it('лёг — рука не стоит вертикально', () => {
    expect(plank.inPosition({ ...base, bodyIncline: 3, armToVertical: 80 })).toBe(false);
  });
});
