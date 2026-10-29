import type { Figure } from '../exercises/registry';
import { ExerciseFigure } from './ExerciseFigure';

interface Props {
  title: string;
  figure: Figure;
  visible: boolean; // тело видно целиком
  progress: number; // 0…1 до начала отсчёта
  countdown: number | null; // 3, 2, 1 или null, пока отсчёта нет
  onBack(): void;
}

// Слой поверх видео: контур «встань сюда боком», индикатор видимости, отсчёт 3-2-1.
export function PrepareScreen({ title, figure, visible, progress, countdown, onBack }: Props) {
  const standing = figure === 'standing';
  return (
    <>
      {countdown === null ? (
        <div className="prepare-guide">
          <ExerciseFigure figure={figure} className="prepare-figure" />
          <div className="prepare-text">{standing ? 'Встань сюда боком' : 'Ляг сюда боком'}</div>
        </div>
      ) : (
        <div className="countdown" key={countdown}>
          {countdown}
        </div>
      )}

      <div className="hud">
        <div className="hud-title">{title}</div>
      </div>

      <div className={visible ? 'visibility ok' : 'visibility'}>
        <div className="visibility-fill" style={{ width: `${progress * 100}%` }} />
        <span>{visible ? 'Тело видно целиком' : 'Тело видно не целиком'}</span>
      </div>

      <div className="bottom-bar">
        <button className="tool-button" onClick={onBack}>
          Назад
        </button>
      </div>
    </>
  );
}
