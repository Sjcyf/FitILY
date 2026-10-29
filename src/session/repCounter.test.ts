import { describe, expect, it } from 'vitest';
import type { FormError, Phase } from '../exercises/types';
import { RepCounter, TOO_FAST, type RepResult } from './repCounter';

const err = (code: string): FormError => ({ code, hint: code, reason: code, points: [] });
const DEPTH = err('depth');
const TOP = err('top');
const LEAN = err('lean');

const STEP_MS = 100;

function makeCounter() {
  return new RepCounter({ minRepMs: 600, incompleteDepth: DEPTH, incompleteTop: TOP });
}

// Прогоняет последовательность фаз, каждая фаза — один кадр через STEP_MS.
// Ошибки техники можно указать для отдельных кадров: ['between', LEAN].
function run(counter: RepCounter, frames: (Phase | [Phase, FormError])[], start = 0) {
  const results: RepResult[] = [];
  frames.forEach((f, i) => {
    const [phase, error] = Array.isArray(f) ? f : [f, undefined];
    const r = counter.update(phase, error ? [error] : [], start + i * STEP_MS);
    if (r) results.push(r);
  });
  return results;
}

// Нормальное повторение ~0,9 с.
const GOOD_REP: Phase[] = ['top', 'between', 'between', 'down', 'down', 'down', 'between', 'between', 'top', 'up'];

describe('RepCounter', () => {
  it('не считает, пока человек ни разу не был в исходном положении', () => {
    const c = makeCounter();
    run(c, ['down', 'between', 'down']);
    expect(c.state).toBe('waiting');
    expect(c.counted + c.failed).toBe(0);
  });

  it('засчитывает правильное повторение', () => {
    const c = makeCounter();
    const results = run(c, ['up', ...GOOD_REP]);
    expect(results).toHaveLength(1);
    expect(results[0].counted).toBe(true);
    expect(c.counted).toBe(1);
    expect(c.state).toBe('ready');
  });

  it('считает несколько повторений подряд', () => {
    const c = makeCounter();
    run(c, ['up', ...GOOD_REP, 'up', ...GOOD_REP, ...GOOD_REP]);
    expect(c.counted).toBe(3);
    expect(c.failed).toBe(0);
  });

  it('дрожание у верха (зона top) не начинает повторение', () => {
    const c = makeCounter();
    const results = run(c, ['up', 'top', 'up', 'top', 'top', 'up']);
    expect(results).toHaveLength(0);
    expect(c.state).toBe('ready');
  });

  it('недостаточная амплитуда: начал, но не дошёл до низа', () => {
    const c = makeCounter();
    const results = run(c, ['up', 'top', 'between', 'between', 'between', 'between', 'between', 'top', 'up']);
    expect(results).toHaveLength(1);
    expect(results[0].counted).toBe(false);
    expect(results[0].errors.map((e) => e.code)).toEqual(['depth']);
    expect(c.failed).toBe(1);
    expect(c.reasons.get('depth')?.count).toBe(1);
  });

  it('ошибка техники в любом кадре повторения — не засчитано', () => {
    const c = makeCounter();
    const frames: (Phase | [Phase, FormError])[] = [...GOOD_REP];
    frames[4] = ['down', LEAN];
    const results = run(c, ['up', ...frames]);
    expect(results[0].counted).toBe(false);
    expect(results[0].errors.map((e) => e.code)).toEqual(['lean']);
  });

  it('одна и та же ошибка в нескольких кадрах считается один раз', () => {
    const c = makeCounter();
    const frames: (Phase | [Phase, FormError])[] = GOOD_REP.map((p) => [p, LEAN]);
    run(c, ['up', ...frames]);
    expect(c.reasons.get('lean')?.count).toBe(1);
  });

  it('ошибки прошлого повторения не переходят на следующее', () => {
    const c = makeCounter();
    const bad: (Phase | [Phase, FormError])[] = [...GOOD_REP];
    bad[4] = ['down', LEAN];
    const results = run(c, ['up', ...bad, ...GOOD_REP]);
    expect(results.map((r) => r.counted)).toEqual([false, true]);
  });

  it('ошибки в исходном положении не влияют на повторение', () => {
    const c = makeCounter();
    const results = run(c, ['up', ['up', LEAN], ...GOOD_REP]);
    expect(results[0].counted).toBe(true);
  });

  it('повторение быстрее 0,6 с не засчитывается', () => {
    const c = makeCounter();
    const results = run(c, ['up', 'between', 'down', 'between', 'up']);
    expect(results[0].counted).toBe(false);
    expect(results[0].errors).toContain(TOO_FAST);
  });

  it('не выпрямился до конца и пошёл на следующее повторение', () => {
    const c = makeCounter();
    const results = run(c, [
      'up',
      ...['between', 'between', 'down', 'down', 'between', 'between', 'top', 'top'],
      // снова вниз, не дойдя до «up»
      ...['between', 'between', 'down', 'down', 'between', 'between', 'top', 'up'],
    ] as Phase[]);
    expect(results.map((r) => r.counted)).toEqual([false, true]);
    expect(results[0].errors.map((e) => e.code)).toEqual(['top']);
  });

  it('interrupt отбрасывает начатое повторение, но сохраняет счёт', () => {
    const c = makeCounter();
    run(c, ['up', ...GOOD_REP, 'between', ['down', LEAN]]);
    c.interrupt();
    expect(c.state).toBe('waiting');
    expect(c.counted).toBe(1);
    expect(c.failed).toBe(0);
    const results = run(c, ['up', ...GOOD_REP], 5000);
    expect(results.map((r) => r.counted)).toEqual([true]);
  });

  it('reset обнуляет счёт', () => {
    const c = makeCounter();
    run(c, ['up', ...GOOD_REP]);
    c.reset();
    expect(c.counted).toBe(0);
    expect(c.state).toBe('waiting');
    expect(c.reasons.size).toBe(0);
  });
});
