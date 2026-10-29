import { useEffect, useRef, useState } from 'react';
import { cameraErrorText, openCamera, stopCamera, type Facing } from '../camera/camera';
import { computeBodyMetrics, type BodyMetricKey } from '../pose/bodyMetrics';
import {
  createPoseDetector,
  startPoseLoop,
  type Delegate,
  type Landmarks,
} from '../pose/poseDetector';
import { chooseSide, sideVisibility, type Side } from '../pose/side';
import { MetricsSmoother } from '../pose/smoothing';
import { DebugOverlay, type DebugData } from './DebugOverlay';
import { SkeletonCanvas, drawSkeleton } from './SkeletonCanvas';
import { useLongPress } from './useLongPress';

// Экран отладки обновляется ~10 раз в секунду, чтобы не перерисовывать React на каждом кадре.
const DEBUG_UPDATE_MS = 100;

// Вызывается на каждом кадре. Может вернуть индексы суставов с ошибкой — они будут красными.
export type PoseHandler = (
  landmarks: Landmarks | null,
  timestamp: number,
  aspect: number,
) => ReadonlySet<number> | void;

interface Props {
  facing: Facing;
  onPose?: PoseHandler;
}

export function CameraView({ facing, onPose }: Props) {
  const onPoseRef = useRef(onPose);
  onPoseRef.current = onPose;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<string | null>('Загрузка модели…');
  const [delegate, setDelegate] = useState<Delegate | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debug, setDebug] = useState<DebugData | null>(null);
  const debugOpenRef = useRef(false);
  debugOpenRef.current = debugOpen;
  const toggleDebug = () => setDebugOpen((v) => !v);
  const longPress = useLongPress(toggleDebug);

  // На компьютере экран отладки открывается клавишей D.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'в') toggleDebug();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setError(null);

    openCamera(facing)
      .then((s) => {
        if (cancelled) {
          stopCamera(s);
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          video.play().catch(() => {});
        }
      })
      .catch((err) => {
        if (!cancelled) setError(cameraErrorText(err));
      });

    return () => {
      cancelled = true;
      stopCamera(stream);
    };
  }, [facing]);

  // Детектор создаётся один раз и переживает переключение камеры.
  useEffect(() => {
    let cancelled = false;
    let stopLoop = () => {};
    let close = () => {};

    createPoseDetector()
      .then(({ landmarker, delegate }) => {
        close = () => landmarker.close();
        if (cancelled) {
          close();
          return;
        }
        setModelStatus(null);
        setDelegate(delegate);
        const video = videoRef.current!;
        const smoother = new MetricsSmoother<BodyMetricKey>();
        let side: Side | undefined;
        let lastDebugUpdate = 0;
        stopLoop = startPoseLoop(
          video,
          landmarker,
          ({ landmarks, timestamp }) => {
            const aspect = video.videoWidth / video.videoHeight;
            const errorPoints = onPoseRef.current?.(landmarks, timestamp, aspect) ?? undefined;
            const canvas = canvasRef.current;
            if (canvas) {
              drawSkeleton(canvas, video.videoWidth, video.videoHeight, landmarks, errorPoints);
            }

            if (!landmarks) {
              side = undefined;
              smoother.reset();
            } else {
              const nextSide = chooseSide(landmarks, side);
              if (nextSide !== side) smoother.reset();
              side = nextSide;
            }
            const raw =
              landmarks && side
                ? computeBodyMetrics(landmarks, side, aspect)
                : null;
            const smoothed = raw ? smoother.next(raw, timestamp) : null;

            if (debugOpenRef.current && timestamp - lastDebugUpdate >= DEBUG_UPDATE_MS) {
              lastDebugUpdate = timestamp;
              setDebug(
                landmarks && side && raw && smoothed
                  ? {
                      side,
                      visibility: {
                        left: sideVisibility(landmarks, 'left'),
                        right: sideVisibility(landmarks, 'right'),
                      },
                      raw,
                      smoothed,
                    }
                  : null,
              );
            }
          },
          setFps,
        );
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setModelStatus('Не удалось загрузить модель позы. Проверьте интернет.');
      });

    return () => {
      cancelled = true;
      stopLoop();
      close();
    };
  }, []);

  const mirrored = facing === 'user';
  return (
    <div className="camera">
      <video
        ref={videoRef}
        className={mirrored ? 'camera-video mirrored' : 'camera-video'}
        autoPlay
        playsInline
        muted
      />
      <SkeletonCanvas ref={canvasRef} mirrored={mirrored} />
      {debugOpen && <DebugOverlay data={debug} />}
      <div className="fps" {...longPress} title="Удерживайте, чтобы открыть отладку">
        {fps === null ? '— FPS' : `${Math.round(fps)} FPS`}
        {delegate && ` · ${delegate}`}
      </div>
      {modelStatus && !error && <div className="camera-status">{modelStatus}</div>}
      {error && <div className="camera-error">{error}</div>}
    </div>
  );
}
