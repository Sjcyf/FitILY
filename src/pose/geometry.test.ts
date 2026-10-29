import { describe, expect, it } from 'vitest';
import {
  angle,
  distance,
  inclineToHorizontal,
  inclineToVertical,
  midpoint,
  toPoint,
  verticalOffsetFromLine,
} from './geometry';

const p = (x: number, y: number) => ({ x, y });

describe('angle', () => {
  it('прямой угол — 90°', () => {
    expect(angle(p(1, 0), p(0, 0), p(0, 1))).toBeCloseTo(90);
  });

  it('прямая линия — 180°', () => {
    expect(angle(p(-1, 0), p(0, 0), p(1, 0))).toBeCloseTo(180);
  });

  it('сложенный сустав — 0°', () => {
    expect(angle(p(1, 0), p(0, 0), p(2, 0))).toBeCloseTo(0);
  });

  it('45° и 135°', () => {
    expect(angle(p(1, 0), p(0, 0), p(1, 1))).toBeCloseTo(45);
    expect(angle(p(1, 0), p(0, 0), p(-1, 1))).toBeCloseTo(135);
  });

  it('не зависит от порядка A и C', () => {
    const a = p(0.3, 0.2);
    const b = p(0.5, 0.5);
    const c = p(0.9, 0.4);
    expect(angle(a, b, c)).toBeCloseTo(angle(c, b, a));
  });

  it('не зависит от масштаба и сдвига', () => {
    const base = angle(p(1, 2), p(3, 3), p(4, 1));
    expect(angle(p(12, 24), p(32, 34), p(42, 14))).toBeCloseTo(base);
  });

  it('вырожденный случай (A совпадает с B) — NaN', () => {
    expect(angle(p(1, 1), p(1, 1), p(2, 2))).toBeNaN();
  });

  it('не даёт NaN на почти прямой линии из-за погрешности', () => {
    const result = angle(p(0, 0), p(0.1, 0.1 + 1e-17), p(0.3, 0.3));
    expect(result).not.toBeNaN();
    expect(result).toBeCloseTo(180);
  });
});

describe('toPoint', () => {
  it('учитывает соотношение сторон: на кадре 16:9 диагональ нормализованных координат — не 45°', () => {
    const aspect = 16 / 9;
    const a = toPoint({ x: 0, y: 0 }, aspect);
    const b = toPoint({ x: 0.5, y: 0.5 }, aspect);
    // В пикселях: dx = 0.5·16, dy = 0.5·9.
    expect(inclineToHorizontal(a, b)).toBeCloseTo((Math.atan2(9, 16) * 180) / Math.PI);
  });

  it('прямой угол в пикселях остаётся прямым после toPoint', () => {
    const w = 1280;
    const h = 720;
    const norm = (x: number, y: number) => toPoint({ x: x / w, y: y / h }, w / h);
    expect(angle(norm(600, 100), norm(300, 100), norm(300, 500))).toBeCloseTo(90);
  });
});

describe('inclineToHorizontal / inclineToVertical', () => {
  it('горизонтальная линия', () => {
    expect(inclineToHorizontal(p(0, 0), p(1, 0))).toBeCloseTo(0);
    expect(inclineToVertical(p(0, 0), p(1, 0))).toBeCloseTo(90);
  });

  it('вертикальная линия', () => {
    expect(inclineToHorizontal(p(0, 0), p(0, 1))).toBeCloseTo(90);
    expect(inclineToVertical(p(0, 0), p(0, 1))).toBeCloseTo(0);
  });

  it('30° в любую сторону и в любом порядке точек', () => {
    const dx = Math.cos(Math.PI / 6);
    const dy = Math.sin(Math.PI / 6);
    expect(inclineToHorizontal(p(0, 0), p(dx, dy))).toBeCloseTo(30);
    expect(inclineToHorizontal(p(0, 0), p(-dx, dy))).toBeCloseTo(30);
    expect(inclineToHorizontal(p(dx, -dy), p(0, 0))).toBeCloseTo(30);
  });

  it('сумма наклонов к горизонту и вертикали — 90°', () => {
    const a = p(0.2, 0.7);
    const b = p(0.5, 0.1);
    expect(inclineToHorizontal(a, b) + inclineToVertical(a, b)).toBeCloseTo(90);
  });

  it('совпадающие точки — NaN', () => {
    expect(inclineToHorizontal(p(1, 1), p(1, 1))).toBeNaN();
  });
});

describe('verticalOffsetFromLine', () => {
  // Ось y направлена вниз: положительное смещение — точка ниже линии.
  it('таз ниже линии плечо–щиколотка (провис) — положительно', () => {
    expect(verticalOffsetFromLine(p(0.5, 0.6), p(0, 0.5), p(1, 0.5))).toBeCloseTo(0.1);
  });

  it('таз выше линии (задран) — отрицательно', () => {
    expect(verticalOffsetFromLine(p(0.5, 0.4), p(0, 0.5), p(1, 0.5))).toBeCloseTo(-0.1);
  });

  it('на наклонной линии', () => {
    expect(verticalOffsetFromLine(p(1, 1), p(0, 0), p(2, 2))).toBeCloseTo(0);
    expect(verticalOffsetFromLine(p(1, 1.5), p(2, 2), p(0, 0))).toBeCloseTo(0.5);
  });

  it('вертикальная линия — NaN', () => {
    expect(verticalOffsetFromLine(p(1, 1), p(0, 0), p(0, 1))).toBeNaN();
  });
});

describe('distance / midpoint', () => {
  it('египетский треугольник', () => {
    expect(distance(p(0, 0), p(3, 4))).toBeCloseTo(5);
  });

  it('середина отрезка', () => {
    expect(midpoint(p(0, 0), p(2, 4))).toEqual({ x: 1, y: 2 });
  });
});
