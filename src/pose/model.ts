// Модель MediaPipe Pose Landmarker lite. Адрес версионирован («/1/»), поэтому
// service worker кэширует его один раз (см. vite.config.ts) и дальше работает офлайн.
export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
export const MODEL_REVISION = 'lite-float16-1';
