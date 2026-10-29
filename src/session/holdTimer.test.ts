import { describe, expect, it } from 'vitest';
import type { FormError } from '../exercises/types';
import { HoldTimer } from './holdTimer';

const SAG: FormError = { code: 'sag', hint: 'Таз провис', reason: 'Провисание таза', points: [] };
const STEP = 100;

function makeTimer(targetMs = 30_000) {
  return new HoldTimer({ targetMs, startMs: 1000, graceMs: 1000, maxViolationMs: 5000, maxFrameGapMs: 250 });
}

type Frame = 'ok' | 'bad' | 'out';

// Подаёт кадры через STEP мс, начиная с времени `from`. Возвращает время после последнего кадра.
function feed(timer: HoldTimer, frame: Frame, ms: number, from: number): number {
  let t = from;
  for (let i = 0; i < ms / STEP; i++) {
    timer.update(frame !== 'out', frame === 'bad' ? [SAG] : [], t);
    t += STEP;
  }
  return t;
}

describe('HoldTimer', () => {
  it('не стартует, пока поза неправильная', () => {
    const timer = makeTimer();
    feed(timer, 'out', 3000, 0);
    feed(timer, 'bad', 3000, 3000);
    expect(timer.state).toBe('waiting');
    expect(timer.cleanMs).toBe(0);
  });

  it('стартует после 1 с правильной позы, эта секунда засчитывается', () => {
    const timer = makeTimer();
    feed(timer, 'ok', 900, 0);
    expect(timer.state).toBe('waiting');
    feed(timer, 'ok', 200, 900);
    expect(timer.state).toBe('running');
    expect(timer.cleanMs).toBe(1000);
  });

  it('неправильный кадр до старта сбрасывает отсчёт старта', () => {
    const timer = makeTimer();
    let t = feed(timer, 'ok', 800, 0);
    t = feed(timer, 'bad', 100, t);
    feed(timer, 'ok', 800, t);
    expect(timer.state).toBe('waiting');
  });

  it('чистое время растёт вместе с реальным', () => {
    const timer = makeTimer();
    feed(timer, 'ok', 6100, 0);
    expect(timer.cleanMs).toBe(6000);
  });

  it('короткое нарушение (< 1 с) прощается и засчитывается', () => {
    const timer = makeTimer();
    let t = feed(timer, 'ok', 3000, 0);
    t = feed(timer, 'bad', 500, t);
    feed(timer, 'ok', 1000, t);
    expect(timer.violations).toBe(0);
    expect(timer.cleanMs).toBe(4400);
  });

  it('долгое нарушение — пауза, время нарушения не засчитывается', () => {
    const timer = makeTimer();
    let t = feed(timer, 'ok', 3000, 0); // чистых 2900
    t = feed(timer, 'bad', 2000, t);
    expect(timer.state).toBe('paused');
    expect(timer.violations).toBe(1);
    expect(timer.reasons.get('sag')?.count).toBe(1);
    const pausedAt = timer.cleanMs;
    expect(pausedAt).toBe(2900);
    feed(timer, 'ok', 1100, t);
    expect(timer.state).toBe('running');
    expect(timer.cleanMs).toBe(pausedAt + 1000);
  });

  it('нарушение дольше 5 с заканчивает подход', () => {
    const timer = makeTimer();
    const t = feed(timer, 'ok', 3000, 0);
    feed(timer, 'bad', 5200, t);
    expect(timer.state).toBe('finished');
    expect(timer.endedBy).toBe('violation');
  });

  it('вышел из позы (встал или лёг) дольше 1 с — подход окончен', () => {
    const timer = makeTimer();
    const t = feed(timer, 'ok', 5000, 0);
    feed(timer, 'out', 1200, t);
    expect(timer.state).toBe('finished');
    expect(timer.endedBy).toBe('left_position');
    expect(timer.cleanMs).toBe(4900); // время вне позы не засчитано
  });

  it('цель достигнута — подход окончен', () => {
    const timer = makeTimer(5000);
    feed(timer, 'ok', 6000, 0);
    expect(timer.state).toBe('finished');
    expect(timer.endedBy).toBe('target');
    expect(timer.cleanMs).toBe(5000);
  });

  it('пока человек не виден, время не идёт и нарушение не копится', () => {
    const timer = makeTimer();
    let t = feed(timer, 'ok', 3000, 0);
    t = feed(timer, 'bad', 500, t);
    for (let i = 0; i < 100; i++) timer.skip((t += STEP)); // 10 с не виден
    feed(timer, 'bad', 300, t);
    expect(timer.state).toBe('running');
    expect(timer.violations).toBe(0);
  });

  it('reset возвращает в начало', () => {
    const timer = makeTimer();
    feed(timer, 'ok', 3000, 0);
    timer.reset();
    expect(timer.state).toBe('waiting');
    expect(timer.cleanMs).toBe(0);
  });
});
