import type { WorkoutView } from '../session/workout';
import { formatTime } from './format';

interface Props {
  title: string;
  mode: 'reps' | 'hold';
  target: number; // повторений или секунд
  view: WorkoutView;
  onPause(): void;
  onStop(): void;
}

// Слой поверх видео во время выполнения: счётчик или таймер, подсказка, «Пауза» / «Стоп».
export function WorkoutScreen({ title, mode, target, view, onPause, onStop }: Props) {
  const done = mode === 'reps' ? view.counted >= target : view.seconds >= target;
  return (
    <>
      <div className="hud">
        <div className="hud-title">{title}</div>
        {mode === 'reps' ? (
          <div className={done ? 'counter done' : 'counter'}>
            {view.counted} / {target}
          </div>
        ) : (
          <div className={done ? 'counter timer done' : 'counter timer'}>
            {formatTime(view.seconds)}
            <span className="counter-target"> / {formatTime(target)}</span>
          </div>
        )}
        {mode === 'reps' && view.failed > 0 && (
          <div className="failed">не засчитано: {view.failed}</div>
        )}
        {mode === 'hold' && view.violations > 0 && (
          <div className="failed">нарушений: {view.violations}</div>
        )}
      </div>

      {view.hint && <div className={`hint hint-${view.tone}`}>{view.hint}</div>}

      {!view.finished && (
        <div className="bottom-bar">
          <button className="tool-button" onClick={onPause}>
            {view.paused ? 'Продолжить' : 'Пауза'}
          </button>
          <button className="tool-button stop" onClick={onStop}>
            Стоп
          </button>
        </div>
      )}
    </>
  );
}
