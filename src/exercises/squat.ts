// Приседания. Камера сбоку, на высоте ~80 см.

import { angle, inclineToVertical, toPoint } from '../pose/geometry';
import { SIDE_POINTS } from '../pose/side';
import { SQUAT } from './config';
import type { FormError, RepExercise, Strictness } from './types';

export interface SquatMetrics extends Record<string, number> {
  knee: number; // таз–колено–щиколотка
  backLean: number; // наклон плечо–таз к вертикали
  heelLift: number; // насколько пятка выше носка, доля высоты кадра
}

const LEAN: FormError = {
  code: 'lean',
  hint: 'Не заваливайся вперёд',
  reason: 'Сильный наклон вперёд',
  points: ['shoulder', 'hip'],
};

const HEELS: FormError = {
  code: 'heels',
  hint: 'Пятки на полу',
  reason: 'Пятки отрываются',
  points: ['heel', 'footIndex'],
};

export function createSquat(strictness: Strictness): RepExercise<SquatMetrics> {
  const c = SQUAT[strictness];
  return {
    id: 'squat',
    title: 'Приседания',
    mode: 'reps',
    startHint: 'Встань прямо, боком к камере',
    requiredPoints: ['shoulder', 'hip', 'knee', 'ankle', ...(c.checkHeels ? (['heel', 'footIndex'] as const) : [])],

    computeMetrics(landmarks, side, aspect) {
      const s = SIDE_POINTS[side];
      const p = (i: number) => toPoint(landmarks[i], aspect);
      return {
        knee: angle(p(s.hip), p(s.knee), p(s.ankle)),
        backLean: inclineToVertical(p(s.shoulder), p(s.hip)),
        // y направлен вниз: пятка выше носка → y пятки меньше.
        heelLift: landmarks[s.footIndex].y - landmarks[s.heel].y,
      };
    },

    phase({ knee }) {
      if (knee > c.up) return 'up';
      if (knee < c.down) return 'down';
      if (knee < c.start) return 'between';
      return 'top';
    },

    checkForm({ backLean, heelLift }) {
      const errors: FormError[] = [];
      if (backLean > c.maxBackLean) errors.push(LEAN);
      if (c.checkHeels && heelLift > c.maxHeelLift) errors.push(HEELS);
      return errors;
    },

    repErrors: {
      incompleteDepth: {
        code: 'depth',
        hint: 'Глубже!',
        reason: 'Недостаточная глубина',
        points: ['knee'],
      },
      incompleteTop: {
        code: 'top',
        hint: 'Встань полностью',
        reason: 'Не выпрямился до конца',
        points: ['hip', 'knee'],
      },
    },
  };
}
