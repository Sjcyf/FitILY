import { PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Ref } from 'react';
import type { Landmarks } from '../pose/poseDetector';

const OK_COLOR = '#22c55e';
const ERROR_COLOR = '#ef4444';
const MIN_VISIBILITY = 0.5;
// Точки 0–10 — лицо; для упражнений не нужны и только загромождают картинку.
const FIRST_BODY_POINT = 11;

const BODY_CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS.filter(
  (c) => c.start >= FIRST_BODY_POINT && c.end >= FIRST_BODY_POINT,
);

interface Props {
  ref?: Ref<HTMLCanvasElement>;
  mirrored?: boolean;
}

// Canvas того же размера, что и кадр видео, растянутый так же (object-fit: contain),
// поэтому нормализованные координаты MediaPipe совпадают с картинкой.
export function SkeletonCanvas({ ref, mirrored }: Props) {
  return <canvas ref={ref} className={mirrored ? 'skeleton mirrored' : 'skeleton'} />;
}

// errorPoints — индексы суставов с ошибкой техники: линии к ним рисуются красным.
export function drawSkeleton(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  landmarks: Landmarks | null,
  errorPoints: ReadonlySet<number> = new Set(),
): void {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (!landmarks) return;

  const scale = Math.max(width, height) / 640;
  const visible = (i: number) => (landmarks[i]?.visibility ?? 0) >= MIN_VISIBILITY;

  ctx.lineCap = 'round';
  ctx.lineWidth = 4 * scale;
  for (const { start, end } of BODY_CONNECTIONS) {
    if (!visible(start) || !visible(end)) continue;
    const a = landmarks[start];
    const b = landmarks[end];
    ctx.strokeStyle = errorPoints.has(start) || errorPoints.has(end) ? ERROR_COLOR : OK_COLOR;
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
  }

  const radius = 5 * scale;
  for (let i = FIRST_BODY_POINT; i < landmarks.length; i++) {
    if (!visible(i)) continue;
    const p = landmarks[i];
    ctx.fillStyle = errorPoints.has(i) ? ERROR_COLOR : '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
