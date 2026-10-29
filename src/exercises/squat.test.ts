import { describe, expect, it } from 'vitest';
import { RepRunner } from '../session/repRunner';
import { ASPECT, squatFrames, squatPose } from '../test/squatPoses';
import { createSquat, type SquatMetrics } from './squat';

const base: SquatMetrics = { knee: 175, backLean: 10, heelLift: 0 };

describe('squat: phase', () => {
  const squat = createSquat('normal');
  it.each([
    [175, 'up'],
    [155, 'top'],
    [120, 'between'],
    [95, 'down'],
  ] as const)('колено %d° → %s', (knee, phase) => {
    expect(squat.phase({ ...base, knee })).toBe(phase);
  });

  it('строгость сдвигает порог низа', () => {
    expect(createSquat('soft').phase({ ...base, knee: 105 })).toBe('down');
    expect(createSquat('normal').phase({ ...base, knee: 95 })).toBe('down');
    expect(createSquat('strict').phase({ ...base, knee: 95 })).toBe('between');
  });
});

describe('squat: checkForm', () => {
  const squat = createSquat('normal');
  it('нормальный наклон — без ошибок', () => {
    expect(squat.checkForm({ ...base, backLean: 40 })).toEqual([]);
  });

  it('сильный наклон вперёд', () => {
    expect(squat.checkForm({ ...base, backLean: 60 }).map((e) => e.code)).toEqual(['lean']);
  });

  it('пятки по умолчанию не проверяются', () => {
    expect(squat.checkForm({ ...base, heelLift: 0.1 })).toEqual([]);
  });
});

const pose = squatPose;

describe('squat + RepRunner на синтетических кадрах', () => {
  it('синтетическая поза даёт заданный угол колена', () => {
    const squat = createSquat('normal');
    expect(squat.computeMetrics(pose(90), 'right', ASPECT).knee).toBeCloseTo(90);
  });

  function runReps(depths: number[]) {
    const runner = new RepRunner(createSquat('normal'));
    let t = 0;
    const feed = (knee: number) => runner.update(pose(knee), (t += 50), ASPECT);
    for (let i = 0; i < 10; i++) feed(175);
    const results = [];
    for (const d of depths) {
      for (const knee of squatFrames(d)) {
        const frame = feed(knee);
        if (frame.rep) results.push(frame.rep);
      }
      for (let i = 0; i < 5; i++) feed(175);
    }
    return { runner, results };
  }

  it('глубокие приседания засчитываются, неглубокое — «Глубже!»', () => {
    const { runner, results } = runReps([85, 85, 125, 85]);
    expect(results.map((r) => r.counted)).toEqual([true, true, false, true]);
    expect(results[2].errors[0].hint).toBe('Глубже!');
    expect(runner.counter.counted).toBe(3);
    expect(runner.counter.failed).toBe(1);
  });

  it('пропавший человек — пауза «не виден» через 0,5 с', () => {
    const runner = new RepRunner(createSquat('normal'));
    runner.update(pose(175), 0, ASPECT);
    // Пропал на 300 мс: до 800 мс ещё прощается, дальше — пауза.
    expect(runner.update(null, 300, ASPECT).status).toBe('ok');
    expect(runner.update(null, 700, ASPECT).status).toBe('ok');
    expect(runner.update(null, 900, ASPECT).status).toBe('not_visible');
    expect(runner.update(pose(175), 1000, ASPECT).status).toBe('ok');
  });
});
