import { describe, expect, it } from 'vitest';
import { createPlank } from '../exercises/plank';
import { createSquat } from '../exercises/squat';
import type { AnyExercise } from '../exercises/types';
import { ASPECT, squatFrames, squatPose } from '../test/squatPoses';
import { ReadyCheck } from './readyCheck';
import { Workout } from './workout';

const STEP = 50;

function squatWorkout(target: number) {
  const workout = new Workout(createSquat('normal') as AnyExercise, target);
  let t = 0;
  const feed = (knee: number) => workout.update(squatPose(knee), (t += STEP), ASPECT);
  const stand = (frames = 10) => {
    for (let i = 0; i < frames; i++) feed(175);
  };
  const squat = (depth: number) => {
    for (const knee of squatFrames(depth)) feed(knee);
    stand(5);
  };
  return { workout, feed, stand, squat };
}

describe('Workout: повторения', () => {
  it('подсказка исходного положения, пока человек ни разу не встал прямо', () => {
    const { feed } = squatWorkout(3);
    expect(feed(120).view.hint).toBe('Встань прямо, боком к камере');
  });

  it('заканчивается на цели, итог с причинами', () => {
    const { workout, stand, squat } = squatWorkout(2);
    stand();
    squat(85);
    squat(125); // неглубоко
    expect(workout.finished).toBe(false);
    squat(85);
    expect(workout.finished).toBe(true);

    const result = workout.result();
    expect(result.counted).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.reasons).toEqual([{ reason: 'Недостаточная глубина', count: 1 }]);
    expect(result.totalMs).toBeGreaterThan(2000);
  });

  it('после цели показывает «Готово!» и больше не считает', () => {
    const { workout, stand, squat, feed } = squatWorkout(1);
    stand();
    squat(85);
    expect(feed(175).view.hint).toBe('Готово!');
    squat(85);
    expect(workout.result().counted).toBe(1);
  });

  it('на паузе не считает и время не идёт', () => {
    const { workout, stand, squat } = squatWorkout(5);
    stand();
    workout.setPaused(true);
    const before = workout.result().totalMs;
    squat(85);
    expect(workout.result().counted).toBe(0);
    expect(workout.result().totalMs).toBe(before);
    workout.setPaused(false);
    stand();
    squat(85);
    expect(workout.result().counted).toBe(1);
  });
});

describe('Workout: события для голоса', () => {
  it('повторения и финиш', () => {
    const workout = new Workout(createSquat('normal') as AnyExercise, 2);
    const events: string[] = [];
    let t = 0;
    const feed = (knee: number) => {
      for (const e of workout.update(squatPose(knee), (t += STEP), ASPECT).events) {
        events.push(e.type === 'rep' ? `rep:${e.counted}:${e.number}` : e.type);
      }
    };
    for (let i = 0; i < 10; i++) feed(175);
    for (const depth of [85, 125, 85]) {
      for (const knee of squatFrames(depth)) feed(knee);
      for (let i = 0; i < 5; i++) feed(175);
    }
    expect(events).toEqual(['rep:true:1', 'rep:false:1', 'rep:true:2', 'finished']);
  });

  it('подсказка исходного положения не озвучивается в первые 2 секунды', () => {
    const workout = new Workout(createSquat('normal') as AnyExercise, 5);
    const hints: string[] = [];
    for (let t = 0; t <= 3000; t += STEP) {
      for (const e of workout.update(squatPose(120), t, ASPECT).events) {
        if (e.type === 'hint') hints.push(`${t}:${e.text}`);
      }
    }
    expect(hints).toEqual(['2000:Встань прямо, боком к камере']);
  });
});

describe('Workout: планка', () => {
  it('остановленный подход — endedBy «stopped»', () => {
    const workout = new Workout(createPlank('normal') as AnyExercise, 30);
    const result = workout.result();
    expect(result.mode).toBe('hold');
    expect(result.endedBy).toBe('stopped');
    expect(result.cleanSec).toBe(0);
  });
});

describe('ReadyCheck', () => {
  it('готов, когда тело видно 1,5 с подряд', () => {
    const check = new ReadyCheck(createSquat('normal'));
    let state = check.update(squatPose(175), 0, ASPECT);
    expect(state.visible).toBe(true);
    for (let t = STEP; t <= 1400; t += STEP) state = check.update(squatPose(175), t, ASPECT);
    expect(state.progress).toBeLessThan(1);
    state = check.update(squatPose(175), 1500, ASPECT);
    expect(state.progress).toBe(1);
  });

  it('долгая пропажа сбрасывает отсчёт', () => {
    const check = new ReadyCheck(createSquat('normal'));
    for (let t = 0; t <= 1000; t += STEP) check.update(squatPose(175), t, ASPECT);
    let state = check.update(null, 1100, ASPECT);
    expect(state.lost).toBe(false); // короткий пропуск прощается
    state = check.update(null, 1700, ASPECT);
    expect(state.lost).toBe(true);
    expect(state.progress).toBe(0);
  });
});
