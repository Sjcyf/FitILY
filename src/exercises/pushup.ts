// Отжимания. Камера сбоку, на высоте 30–50 см.

import {
  angle,
  distance,
  inclineToHorizontal,
  toPoint,
  verticalOffsetFromLine,
} from '../pose/geometry';
import { SIDE_POINTS } from '../pose/side';
import { PUSHUP } from './config';
import type { FormError, RepExercise, Strictness } from './types';

export interface PushupMetrics extends Record<string, number> {
  elbow: number; // плечо–локоть–запястье
  bodyLine: number; // плечо–таз–щиколотка
  hipOffset: number; // таз ниже (> 0) / выше (< 0) линии плечо–щиколотка, доля её длины
  knee: number; // таз–колено–щиколотка
  bodyIncline: number; // плечо–щиколотка к горизонту
}

const SAG: FormError = {
  code: 'sag',
  hint: 'Таз провис',
  reason: 'Провисание таза',
  points: ['hip'],
};

const PIKE: FormError = {
  code: 'pike',
  hint: 'Таз задран',
  reason: 'Таз поднят',
  points: ['hip'],
};

const KNEES: FormError = {
  code: 'knees',
  hint: 'Не опускай колени',
  reason: 'Согнуты колени',
  points: ['knee'],
};

export function createPushup(strictness: Strictness): RepExercise<PushupMetrics> {
  const c = PUSHUP[strictness];
  return {
    id: 'pushup',
    title: 'Отжимания',
    mode: 'reps',
    startHint: 'Прими упор лёжа на прямых руках',
    requiredPoints: ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'],

    computeMetrics(landmarks, side, aspect) {
      const s = SIDE_POINTS[side];
      const p = (i: number) => toPoint(landmarks[i], aspect);
      const shoulder = p(s.shoulder);
      const hip = p(s.hip);
      const ankle = p(s.ankle);
      return {
        elbow: angle(shoulder, p(s.elbow), p(s.wrist)),
        bodyLine: angle(shoulder, hip, ankle),
        hipOffset: verticalOffsetFromLine(hip, shoulder, ankle) / distance(shoulder, ankle),
        knee: angle(hip, p(s.knee), ankle),
        bodyIncline: inclineToHorizontal(shoulder, ankle),
      };
    },

    inPosition: ({ bodyIncline }) => bodyIncline < c.maxBodyIncline,

    phase({ elbow }) {
      if (elbow > c.up) return 'up';
      if (elbow < c.down) return 'down';
      if (elbow < c.start) return 'between';
      return 'top';
    },

    checkForm({ bodyLine, hipOffset, knee }) {
      const errors: FormError[] = [];
      if (bodyLine < c.minBodyLine) errors.push(hipOffset > 0 ? SAG : PIKE);
      if (knee < c.minKnee) errors.push(KNEES);
      return errors;
    },

    repErrors: {
      incompleteDepth: {
        code: 'depth',
        hint: 'Ниже!',
        reason: 'Недостаточная глубина',
        points: ['elbow'],
      },
      incompleteTop: {
        code: 'top',
        hint: 'Выпрями руки',
        reason: 'Руки не выпрямлены до конца',
        points: ['elbow'],
      },
    },
  };
}
