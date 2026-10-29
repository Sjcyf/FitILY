// Все пороги в одном месте. Значения «нормально» — стартовые из SPEC.md,
// уточняются на калибровке. Строгость сдвигает пороги примерно на ±10°.

import type { Strictness } from './types';

export const GENERAL = {
  minVisibility: 0.5, // точка считается видимой
  notVisibleMs: 500, // столько можно не видеть нужные точки, потом пауза «Тебя не видно»
  smoothingWindow: 5, // кадров в скользящем среднем
  minRepMs: 600, // повторение быстрее — не засчитывается
  sideSwitchMargin: 0.1, // перевес видимости для смены стороны
};

// Экран подготовки.
export const PREPARE = {
  visibleMs: 1500, // нужные точки видны столько подряд — начинается отсчёт
  countdownSec: 3, // отсчёт 3-2-1
};

// Таймер для упражнений на время (планка).
export const HOLD = {
  startMs: 1000, // поза правильная столько подряд — таймер стартует
  graceMs: 1000, // нарушение короче — прощается; вышел из позы дольше — подход окончен
  maxViolationMs: 5000, // нарушение дольше — подход окончен
  maxFrameGapMs: 250, // больший промежуток между кадрами в чистое время не идёт
};

export interface SquatConfig {
  up: number; // угол колена «встал полностью», больше
  start: number; // угол колена «начал приседать», меньше
  down: number; // угол колена «низ», меньше
  maxBackLean: number; // наклон линии плечо–таз к вертикали
  checkHeels: boolean; // проверка пяток — включить после тестов
  maxHeelLift: number; // пятка выше носка, доля высоты кадра
}

export const SQUAT: Record<Strictness, SquatConfig> = {
  soft: { up: 150, start: 140, down: 110, maxBackLean: 60, checkHeels: false, maxHeelLift: 0.04 },
  normal: { up: 160, start: 145, down: 100, maxBackLean: 50, checkHeels: false, maxHeelLift: 0.03 },
  strict: { up: 165, start: 150, down: 90, maxBackLean: 40, checkHeels: false, maxHeelLift: 0.02 },
};

export interface PushupConfig {
  up: number; // угол в локте «руки выпрямлены», больше
  start: number; // угол в локте «начал опускаться», меньше
  down: number; // угол в локте «низ», меньше
  minBodyLine: number; // плечо–таз–щиколотка, всё повторение
  minKnee: number; // таз–колено–щиколотка, ноги прямые
  maxBodyIncline: number; // плечо–щиколотка к горизонту: больше — не в упоре, счёт не идёт
}

export const PUSHUP: Record<Strictness, PushupConfig> = {
  soft: { up: 145, start: 135, down: 100, minBodyLine: 150, minKnee: 150, maxBodyIncline: 40 },
  normal: { up: 155, start: 140, down: 90, minBodyLine: 160, minKnee: 160, maxBodyIncline: 40 },
  strict: { up: 160, start: 145, down: 80, minBodyLine: 165, minKnee: 165, maxBodyIncline: 40 },
};

export interface SitupConfig {
  lying: number; // плечо–таз к горизонту «лёг», меньше (исходное положение)
  start: number; // «начал подниматься», больше
  raised: number; // «поднялся», больше
  minKnee: number; // ноги согнуты: таз–колено–щиколотка в диапазоне
  maxKnee: number;
  touchKnees: boolean; // требовать касания локтями коленей (опция)
  maxElbowKnee: number; // расстояние локоть–колено / длина корпуса
}

export interface PlankConfig {
  minBodyLine: number; // плечо–таз–щиколотка
  forearmMinElbow: number; // упор на предплечья: угол в локте в диапазоне
  forearmMaxElbow: number;
  straightMinElbow: number; // упор на прямых руках: угол в локте больше
  maxBodyIncline: number; // плечо–щиколотка к горизонту: больше — не в планке
  maxArmToVertical: number; // плечо–локоть к вертикали: больше — руки не держат, человек лёг
}

export const PLANK: Record<Strictness, PlankConfig> = {
  soft: { minBodyLine: 150, forearmMinElbow: 60, forearmMaxElbow: 120, straightMinElbow: 145, maxBodyIncline: 30, maxArmToVertical: 50 },
  normal: { minBodyLine: 160, forearmMinElbow: 70, forearmMaxElbow: 110, straightMinElbow: 155, maxBodyIncline: 30, maxArmToVertical: 50 },
  strict: { minBodyLine: 165, forearmMinElbow: 75, forearmMaxElbow: 105, straightMinElbow: 160, maxBodyIncline: 30, maxArmToVertical: 50 },
};

export const SITUP: Record<Strictness, SitupConfig> = {
  soft: { lying: 25, start: 35, raised: 60, minKnee: 50, maxKnee: 120, touchKnees: false, maxElbowKnee: 0.45 },
  normal: { lying: 20, start: 35, raised: 70, minKnee: 60, maxKnee: 110, touchKnees: false, maxElbowKnee: 0.35 },
  strict: { lying: 15, start: 30, raised: 80, minKnee: 70, maxKnee: 100, touchKnees: false, maxElbowKnee: 0.3 },
};
