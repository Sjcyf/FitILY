// Загрузка MediaPipe Pose Landmarker и цикл обработки кадров. Без React.

import { PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import { MODEL_URL } from './model';

export type Landmarks = NormalizedLandmark[];
export type Delegate = 'GPU' | 'CPU';

export interface PoseDetector {
  landmarker: PoseLandmarker;
  delegate: Delegate;
}

async function create(delegate: Delegate): Promise<PoseLandmarker> {
  return PoseLandmarker.createFromOptions(
    { wasmLoaderPath, wasmBinaryPath },
    {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    },
  );
}

// GPU быстрее, но на части телефонов WebGL-делегат не стартует — тогда CPU.
export async function createPoseDetector(): Promise<PoseDetector> {
  try {
    return { landmarker: await create('GPU'), delegate: 'GPU' };
  } catch (err) {
    console.warn('GPU delegate failed, falling back to CPU', err);
    return { landmarker: await create('CPU'), delegate: 'CPU' };
  }
}

export interface PoseFrame {
  landmarks: Landmarks | null; // null — человек не найден
  timestamp: number; // мс, performance.now()
}

// Обрабатывает каждый новый кадр видео. onFps вызывается раз в секунду.
// Возвращает функцию остановки цикла.
export function startPoseLoop(
  video: HTMLVideoElement,
  detector: PoseLandmarker,
  onFrame: (frame: PoseFrame) => void,
  onFps?: (fps: number) => void,
): () => void {
  let running = true;
  let rafId = 0;
  let lastVideoTime = -1;
  let lastTimestamp = 0;
  let frames = 0;
  let fpsWindowStart = performance.now();

  const tick = () => {
    if (!running) return;
    rafId = requestAnimationFrame(tick);

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) return;
    if (video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;

    // MediaPipe требует строго возрастающие метки времени.
    const timestamp = Math.max(performance.now(), lastTimestamp + 1);
    lastTimestamp = timestamp;

    try {
      const result = detector.detectForVideo(video, timestamp);
      onFrame({ landmarks: result.landmarks[0] ?? null, timestamp });
    } catch (err) {
      console.warn('detectForVideo failed', err);
      return;
    }

    frames++;
    const elapsed = timestamp - fpsWindowStart;
    if (elapsed >= 1000) {
      onFps?.((frames * 1000) / elapsed);
      frames = 0;
      fpsWindowStart = timestamp;
    }
  };

  rafId = requestAnimationFrame(tick);
  return () => {
    running = false;
    cancelAnimationFrame(rafId);
  };
}
