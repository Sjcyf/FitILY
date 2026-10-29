import { useEffect, useMemo, useRef, useState } from 'react';
import type { Facing } from '../camera/camera';
import { PREPARE } from '../exercises/config';
import { exerciseInfo } from '../exercises/registry';
import { sounds, voice } from '../feedback';
import { Coach } from '../feedback/coach';
import { ReadyCheck } from '../session/readyCheck';
import { Workout, sameView, type WorkoutResult, type WorkoutView } from '../session/workout';
import { CameraView, type PoseHandler } from './CameraView';
import { PrepareScreen } from './PrepareScreen';
import type { WorkoutSettings } from './SelectScreen';
import { WorkoutScreen } from './WorkoutScreen';
import { useWakeLock } from './useWakeLock';

// Сколько показывать «Готово!» / «Подход окончен» перед экраном итога.
const FINISH_DELAY_MS = 2000;

type Phase = 'prepare' | 'countdown' | 'workout';

interface PrepareView {
  visible: boolean;
  progress: number;
  countdown: number | null;
}

interface Props {
  settings: WorkoutSettings;
  facing: Facing;
  onFinish(result: WorkoutResult): void;
  onBack(): void;
}

// Подготовка и выполнение на одной камере: модель позы не перезагружается между ними.
export function SessionScreen({ settings, facing, onFinish, onBack }: Props) {
  const info = exerciseInfo(settings.exerciseId);
  const exercise = useMemo(
    () => info.create(settings.strictness, { plankArms: settings.plankArms }),
    [info, settings],
  );
  const readyRef = useRef<ReadyCheck<Record<string, number>> | null>(null);
  readyRef.current ??= new ReadyCheck(exercise);
  const workoutRef = useRef<Workout | null>(null);
  const phaseRef = useRef<Phase>('prepare');
  const countdownStart = useRef(0);
  const lastCountdown = useRef<number | null>(null);
  const coachRef = useRef<Coach | null>(null);
  coachRef.current ??= new Coach(voice, sounds);
  const coach = coachRef.current;

  // Телефон не должен уснуть ни на подготовке, ни во время планки.
  useWakeLock();
  // Уход с экрана обрывает начатую фразу.
  useEffect(() => () => voice.stop(), []);

  const [phase, setPhase] = useState<Phase>('prepare');
  const [prepare, setPrepare] = useState<PrepareView>({ visible: false, progress: 0, countdown: null });
  const [view, setView] = useState<WorkoutView | null>(null);

  const onPose: PoseHandler = (landmarks, t, aspect) => {
    if (phaseRef.current !== 'workout') {
      const ready = readyRef.current!.update(landmarks, t, aspect);
      let countdown: number | null = null;

      if (phaseRef.current === 'prepare' && ready.progress >= 1) {
        phaseRef.current = 'countdown';
        countdownStart.current = t;
      }
      if (phaseRef.current === 'countdown') {
        if (ready.lost) {
          // Ушёл из кадра во время отсчёта — начинаем подготовку заново.
          phaseRef.current = 'prepare';
        } else {
          const left = PREPARE.countdownSec - Math.floor((t - countdownStart.current) / 1000);
          if (left > 0) countdown = left;
          else {
            phaseRef.current = 'workout';
            workoutRef.current = new Workout(exercise, settings.target);
            coach.start();
          }
        }
      }
      if (countdown !== null && countdown !== lastCountdown.current) coach.countdown(countdown);
      lastCountdown.current = countdown;

      setPhase(phaseRef.current);
      setPrepare((prev) =>
        prev.visible === ready.visible &&
        prev.progress === ready.progress &&
        prev.countdown === countdown
          ? prev
          : { visible: ready.visible, progress: ready.progress, countdown },
      );
      if (phaseRef.current !== 'workout') return;
    }

    const { view: next, errorPoints, events } = workoutRef.current!.update(landmarks, t, aspect);
    coach.handle(events, t);
    setView((prev) => (prev && sameView(prev, next) ? prev : next));
    return errorPoints;
  };

  const finished = view?.finished ?? false;
  useEffect(() => {
    if (!finished) return;
    const timer = window.setTimeout(() => onFinish(workoutRef.current!.result()), FINISH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [finished, onFinish]);

  return (
    <div className="screen">
      <CameraView facing={facing} onPose={onPose} />
      {phase === 'workout' ? (
        <WorkoutScreen
          title={exercise.title}
          mode={exercise.mode}
          target={settings.target}
          view={view ?? INITIAL_VIEW}
          onPause={() => workoutRef.current?.setPaused(!view?.paused)}
          onStop={() => onFinish(workoutRef.current!.result())}
        />
      ) : (
        <PrepareScreen
          title={exercise.title}
          figure={info.figure}
          visible={prepare.visible}
          progress={prepare.progress}
          countdown={prepare.countdown}
          onBack={onBack}
        />
      )}
    </div>
  );
}

const INITIAL_VIEW: WorkoutView = {
  counted: 0,
  failed: 0,
  seconds: 0,
  violations: 0,
  hint: '',
  tone: 'info',
  paused: false,
  finished: false,
};
