// Общий интерфейс упражнения. Новое упражнение — один файл, реализующий его.

import type { LandmarkLike } from '../pose/geometry';
import type { Side, SidePoints, VisibilityLike } from '../pose/side';

export type ExerciseId = 'pushup' | 'squat' | 'situp' | 'plank';
export type Strictness = 'soft' | 'normal' | 'strict';
export type PointName = keyof SidePoints;
export type Landmark = LandmarkLike & VisibilityLike;
export type Metrics = Record<string, number>;

// Положение в повторении по трём порогам упражнения:
//   up      — исходное положение, за порогом «верха»;
//   top     — между «верхом» и порогом начала движения (дрожание у верха, ещё не начал);
//   between — движение началось, но порог «низа» ещё не достигнут;
//   down    — порог «низа» достигнут.
// Для пресса «верх» — это лёжа, «низ» — поднятое туловище: машина та же.
export type Phase = 'up' | 'top' | 'between' | 'down';

export interface FormError {
  code: string;
  hint: string; // короткая подсказка на экране / голосом: «Глубже!»
  reason: string; // причина в итоговой статистике: «Недостаточная глубина»
  points: PointName[]; // суставы, которые подсвечиваются красным
}

export interface ExerciseBase<M extends Metrics = Metrics> {
  id: ExerciseId;
  title: string;
  // Точки, которые должны быть видны (visibility ≥ порога) на выбранной стороне.
  requiredPoints: PointName[];
  // aspect — ширина / высота кадра, нужен для правильных углов.
  computeMetrics(landmarks: readonly Landmark[], side: Side, aspect: number): M;
  // Нарушения техники в этом кадре.
  checkForm(metrics: M): FormError[];
  // Человек в исходной позе для упражнения (например, в упоре лёжа). Иначе счёт не идёт.
  inPosition?(metrics: M): boolean;
  // Подсказка, пока человек не занял исходное положение: «Прими упор лёжа».
  startHint: string;
}

export interface HoldExercise<M extends Metrics = Metrics> extends ExerciseBase<M> {
  mode: 'hold';
  // Для упражнений на время поза обязательна: вне её таймер не стартует, а после старта
  // выход из позы дольше секунды заканчивает подход.
  inPosition(metrics: M): boolean;
}

export type AnyExercise = RepExercise | HoldExercise;

export interface RepExercise<M extends Metrics = Metrics> extends ExerciseBase<M> {
  mode: 'reps';
  phase(metrics: M): Phase;
  // Ошибки, которые определяет машина состояний, а не отдельный кадр.
  repErrors: {
    incompleteDepth: FormError; // начал движение, но не дошёл до «низа»
    incompleteTop: FormError; // из «низа» не вернулся до «верха» и пошёл на следующее
  };
}
