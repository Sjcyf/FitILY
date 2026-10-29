// Пресс: подъём туловища из положения лёжа, ноги согнуты. Камера сбоку, на высоте 30–50 см.
//
// Машина состояний та же, что у приседаний, но «исходное положение» (phase 'up') —
// лёжа, а «низ» (phase 'down') — поднятое туловище.

import { angle, distance, inclineToHorizontal, toPoint } from '../pose/geometry';
import { SIDE_POINTS } from '../pose/side';
import { SITUP } from './config';
import type { FormError, RepExercise, Strictness } from './types';

export interface SitupMetrics extends Record<string, number> {
  torso: number; // плечо–таз к горизонту
  knee: number; // таз–колено–щиколотка
  elbowKnee: number; // расстояние локоть–колено / длина корпуса
}

const LEGS: FormError = {
  code: 'legs',
  hint: 'Согни ноги',
  reason: 'Ноги не согнуты',
  points: ['knee'],
};

export function createSitup(strictness: Strictness): RepExercise<SitupMetrics> {
  const c = SITUP[strictness];
  return {
    id: 'situp',
    title: 'Пресс',
    mode: 'reps',
    startHint: 'Ляг на спину, ноги согни',
    requiredPoints: ['shoulder', 'hip', 'knee', 'ankle', ...(c.touchKnees ? (['elbow'] as const) : [])],

    computeMetrics(landmarks, side, aspect) {
      const s = SIDE_POINTS[side];
      const p = (i: number) => toPoint(landmarks[i], aspect);
      const shoulder = p(s.shoulder);
      const hip = p(s.hip);
      const knee = p(s.knee);
      return {
        torso: inclineToHorizontal(shoulder, hip),
        knee: angle(hip, knee, p(s.ankle)),
        elbowKnee: distance(p(s.elbow), knee) / distance(shoulder, hip),
      };
    },

    phase({ torso, elbowKnee }) {
      if (torso < c.lying) return 'up';
      // С опцией касания «верх» засчитывается, только когда локти дошли до коленей.
      if (torso > c.raised && (!c.touchKnees || elbowKnee < c.maxElbowKnee)) return 'down';
      if (torso > c.start) return 'between';
      return 'top';
    },

    checkForm({ knee }) {
      return knee < c.minKnee || knee > c.maxKnee ? [LEGS] : [];
    },

    repErrors: {
      incompleteDepth: c.touchKnees
        ? {
            code: 'touch',
            hint: 'Локтями до коленей',
            reason: 'Локти не коснулись коленей',
            points: ['elbow', 'knee'],
          }
        : {
            code: 'height',
            hint: 'Выше!',
            reason: 'Недостаточный подъём',
            points: ['shoulder'],
          },
      incompleteTop: {
        code: 'lie',
        hint: 'Ложись до конца',
        reason: 'Не опустился до пола',
        points: ['shoulder'],
      },
    },
  };
}
