// Список упражнений для экрана выбора. Новое упражнение: модуль с create-функцией
// и одна запись здесь.

import { createPlank, type PlankArms } from './plank';
import { createPushup } from './pushup';
import { createSitup } from './situp';
import { createSquat } from './squat';
import type { AnyExercise, ExerciseId, Strictness } from './types';

export type Figure = 'standing' | 'pushup' | 'situp' | 'plank';

export interface ExerciseOptions {
  plankArms: PlankArms;
}

export interface ExerciseInfo {
  id: ExerciseId;
  title: string;
  mode: 'reps' | 'hold';
  figure: Figure; // картинка на карточке и контур на экране подготовки
  placeHint: string; // как поставить камеру
  defaultTarget: number; // повторений или секунд
  create(strictness: Strictness, options: ExerciseOptions): AnyExercise;
}

export const EXERCISES: ExerciseInfo[] = [
  {
    id: 'pushup',
    title: 'Отжимания',
    mode: 'reps',
    figure: 'pushup',
    placeHint: 'Камера сбоку, 30–50 см от пола',
    defaultTarget: 10,
    create: (s) => createPushup(s) as AnyExercise,
  },
  {
    id: 'squat',
    title: 'Приседания',
    mode: 'reps',
    figure: 'standing',
    placeHint: 'Камера сбоку, ~80 см от пола',
    defaultTarget: 10,
    create: (s) => createSquat(s) as AnyExercise,
  },
  {
    id: 'situp',
    title: 'Пресс',
    mode: 'reps',
    figure: 'situp',
    placeHint: 'Камера сбоку, 30–50 см от пола',
    defaultTarget: 10,
    create: (s) => createSitup(s) as AnyExercise,
  },
  {
    id: 'plank',
    title: 'Планка',
    mode: 'hold',
    figure: 'plank',
    placeHint: 'Камера сбоку, 30–50 см от пола',
    defaultTarget: 30,
    create: (s, o) => createPlank(s, o.plankArms) as AnyExercise,
  },
];

export function exerciseInfo(id: ExerciseId): ExerciseInfo {
  return EXERCISES.find((e) => e.id === id)!;
}
