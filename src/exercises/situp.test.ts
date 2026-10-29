import { describe, expect, it } from 'vitest';
import { RepCounter } from '../session/repCounter';
import { createSitup, type SitupMetrics } from './situp';

const base: SitupMetrics = { torso: 5, knee: 90, elbowKnee: 1 };

describe('situp: phase', () => {
  const situp = createSitup('normal');
  it.each([
    [5, 'up'], // лёжа — исходное положение
    [28, 'top'],
    [50, 'between'],
    [80, 'down'], // поднялся
  ] as const)('корпус %d° к горизонту → %s', (torso, phase) => {
    expect(situp.phase({ ...base, torso })).toBe(phase);
  });
});

describe('situp: checkForm', () => {
  const situp = createSitup('normal');
  it('ноги согнуты под 90° — без ошибок', () => {
    expect(situp.checkForm(base)).toEqual([]);
  });

  it('прямые ноги — «Согни ноги»', () => {
    expect(situp.checkForm({ ...base, knee: 160 }).map((e) => e.hint)).toEqual(['Согни ноги']);
  });

  it('слишком сильно поджатые ноги — тоже ошибка', () => {
    expect(situp.checkForm({ ...base, knee: 40 })).toHaveLength(1);
  });
});

describe('situp: повторения', () => {
  function run(torsoSequence: number[]) {
    const situp = createSitup('normal');
    const counter = new RepCounter({ minRepMs: 600, ...situp.repErrors });
    return torsoSequence
      .map((torso, i) => {
        const m = { ...base, torso };
        return counter.update(situp.phase(m), situp.checkForm(m), i * 100);
      })
      .filter((r) => r !== null);
  }

  const up = [5, 5, 30, 45, 60, 75, 80, 80, 60, 45, 30, 10, 5];

  it('полный подъём засчитывается', () => {
    expect(run(up).map((r) => r.counted)).toEqual([true]);
  });

  it('не поднялся выше 70° — «Выше!»', () => {
    const results = run([5, 5, 30, 45, 55, 60, 55, 45, 30, 10, 5]);
    expect(results[0].counted).toBe(false);
    expect(results[0].errors[0].hint).toBe('Выше!');
  });

  it('не лёг до конца перед следующим — «Ложись до конца»', () => {
    const results = run([5, 5, 40, 60, 80, 80, 60, 40, 30, 28, 40, 60, 80, 80, 60, 30, 10, 5]);
    expect(results.map((r) => r.counted)).toEqual([false, true]);
    expect(results[0].errors[0].hint).toBe('Ложись до конца');
  });
});
