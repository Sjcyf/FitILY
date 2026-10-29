import type { WorkoutResult } from '../session/workout';
import { formatTime } from './format';

interface Props {
  result: WorkoutResult;
  onRepeat(): void;
  onChange(): void;
}

const ENDED_BY: Record<NonNullable<WorkoutResult['endedBy']>, string> = {
  target: 'Цель достигнута',
  violation: 'Подход окончен: нарушение дольше 5 секунд',
  left_position: 'Подход окончен: вышел из позы',
  stopped: 'Остановлено',
};

export function ResultScreen({ result, onRepeat, onChange }: Props) {
  const reps = result.mode === 'reps';
  const success = reps ? result.counted >= result.target : result.endedBy === 'target';

  return (
    <div className="result">
      <h1>{result.title}</h1>

      <div className={success ? 'result-main success' : 'result-main'}>
        {reps ? (
          <>
            Засчитано <b>{result.counted}</b> из {result.target}
          </>
        ) : (
          <>
            Чистое время <b>{formatTime(result.cleanSec)}</b> из {formatTime(result.target)}
          </>
        )}
      </div>

      <div className="result-stats">
        {reps ? (
          <div>Не засчитано: {result.failed}</div>
        ) : (
          <>
            <div>{ENDED_BY[result.endedBy ?? 'stopped']}</div>
            <div>Нарушений: {result.violations}</div>
          </>
        )}
        <div>Общее время: {formatTime(Math.round(result.totalMs / 1000))}</div>
      </div>

      {result.reasons.length > 0 && (
        <ul className="reasons">
          {result.reasons.map(({ reason, count }) => (
            <li key={reason}>
              {reason} — {count}
            </li>
          ))}
        </ul>
      )}

      <div className="result-buttons">
        <button className="big-button" onClick={onRepeat}>
          Ещё раз
        </button>
        <button className="big-button secondary" onClick={onChange}>
          Другое упражнение
        </button>
      </div>
    </div>
  );
}
