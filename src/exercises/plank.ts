// Планка на время. Камера сбоку, на высоте 30–50 см.

import {
  angle,
  distance,
  inclineToHorizontal,
  inclineToVertical,
  toPoint,
  verticalOffsetFromLine,
} from '../pose/geometry';
import { SIDE_POINTS } from '../pose/side';
import { PLANK } from './config';
import type { FormError, HoldExercise, Strictness } from './types';

export type PlankArms = 'forearms' | 'straight';

export interface PlankMetrics extends Record<string, number> {
  bodyLine: number; // плечо–таз–щиколотка
  hipOffset: number; // таз ниже (> 0) / выше (< 0) линии плечо–щиколотка, доля её длины
  elbow: number; // плечо–локоть–запястье
  bodyIncline: number; // плечо–щиколотка к горизонту
  armToVertical: number; // плечо–локоть к вертикали
}

const SAG: FormError = {
  code: 'sag',
  hint: 'Таз провис',
  reason: 'Провисание таза',
  points: ['hip'],
};

const PIKE: FormError = {
  code: 'pike',
  hint: 'Опусти таз',
  reason: 'Таз поднят',
  points: ['hip'],
};

const ELBOWS: FormError = {
  code: 'elbows',
  hint: 'Локти под плечами',
  reason: 'Локти не под плечами',
  points: ['elbow'],
};

const STRAIGHT_ARMS: FormError = {
  code: 'arms',
  hint: 'Выпрями руки',
  reason: 'Руки согнуты',
  points: ['elbow'],
};

export function createPlank(strictness: Strictness, arms: PlankArms = 'forearms'): HoldExercise<PlankMetrics> {
  const c = PLANK[strictness];
  return {
    id: 'plank',
    title: 'Планка',
    mode: 'hold',
    startHint: arms === 'forearms' ? 'Прими упор на предплечьях' : 'Прими упор на прямых руках',
    requiredPoints: ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'],

    computeMetrics(landmarks, side, aspect) {
      const s = SIDE_POINTS[side];
      const p = (i: number) => toPoint(landmarks[i], aspect);
      const shoulder = p(s.shoulder);
      const elbow = p(s.elbow);
      const hip = p(s.hip);
      const ankle = p(s.ankle);
      return {
        bodyLine: angle(shoulder, hip, ankle),
        hipOffset: verticalOffsetFromLine(hip, shoulder, ankle) / distance(shoulder, ankle),
        elbow: angle(shoulder, elbow, p(s.wrist)),
        bodyIncline: inclineToHorizontal(shoulder, ankle),
        armToVertical: inclineToVertical(shoulder, elbow),
      };
    },

    // Горизонтально и с упором на руки. Встал — тело не горизонтально;
    // лёг — плечо опустилось к полу и рука больше не стоит вертикально.
    inPosition: ({ bodyIncline, armToVertical }) =>
      bodyIncline < c.maxBodyIncline && armToVertical < c.maxArmToVertical,

    checkForm({ bodyLine, hipOffset, elbow }) {
      const errors: FormError[] = [];
      if (bodyLine < c.minBodyLine) errors.push(hipOffset > 0 ? SAG : PIKE);
      if (arms === 'forearms') {
        if (elbow < c.forearmMinElbow || elbow > c.forearmMaxElbow) errors.push(ELBOWS);
      } else if (elbow < c.straightMinElbow) {
        errors.push(STRAIGHT_ARMS);
      }
      return errors;
    },
  };
}
