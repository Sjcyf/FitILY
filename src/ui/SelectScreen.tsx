import { useState } from 'react';
import type { PlankArms } from '../exercises/plank';
import { EXERCISES, exerciseInfo } from '../exercises/registry';
import type { ExerciseId, Strictness } from '../exercises/types';
import { ExerciseFigure } from './ExerciseFigure';

export interface WorkoutSettings {
  exerciseId: ExerciseId;
  target: number; // повторений или секунд
  strictness: Strictness;
  plankArms: PlankArms;
}

const STORAGE_KEY = 'fitily.settings';

// Последние настройки запоминаются в браузере, чтобы преподавателю не вводить их заново.
export function loadSettings(): WorkoutSettings {
  const fallback: WorkoutSettings = {
    exerciseId: 'pushup',
    target: exerciseInfo('pushup').defaultTarget,
    strictness: 'normal',
    plankArms: 'forearms',
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && EXERCISES.some((e) => e.id === saved.exerciseId)) return { ...fallback, ...saved };
  } catch {
    // Хранилище недоступно (приватный режим) — берём значения по умолчанию.
  }
  return fallback;
}

function saveSettings(settings: WorkoutSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Не критично.
  }
}

const STRICTNESS: { value: Strictness; label: string }[] = [
  { value: 'soft', label: 'Мягко' },
  { value: 'normal', label: 'Нормально' },
  { value: 'strict', label: 'Строго' },
];

const ARMS: { value: PlankArms; label: string }[] = [
  { value: 'forearms', label: 'На предплечьях' },
  { value: 'straight', label: 'На прямых руках' },
];

interface Props {
  initial: WorkoutSettings;
  onStart(settings: WorkoutSettings): void;
}

export function SelectScreen({ initial, onStart }: Props) {
  const [settings, setSettings] = useState(initial);
  const info = exerciseInfo(settings.exerciseId);
  const isHold = info.mode === 'hold';
  const [min, max, step] = isHold ? [5, 600, 5] : [1, 100, 1];

  const update = (patch: Partial<WorkoutSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const selectExercise = (id: ExerciseId) => {
    if (id === settings.exerciseId) return;
    // При смене упражнения цель сбрасывается на значение по умолчанию: 10 повторений ≠ 10 секунд.
    setDraft(null);
    update({ exerciseId: id, target: exerciseInfo(id).defaultTarget });
  };
  // Пока поле редактируется, значение не ограничивается (иначе «25» не набрать: «2» сразу станет 5).
  const [draft, setDraft] = useState<string | null>(null);
  const setTarget = (value: number) => {
    setDraft(null);
    if (Number.isFinite(value)) update({ target: Math.min(max, Math.max(min, Math.round(value))) });
  };

  return (
    <div className="select">
      <div className="cards">
        {EXERCISES.map((e) => (
          <button
            key={e.id}
            className={e.id === settings.exerciseId ? 'card selected' : 'card'}
            onClick={() => selectExercise(e.id)}
          >
            <ExerciseFigure figure={e.figure} className="card-figure" />
            <span className="card-title">{e.title}</span>
            <span className="card-hint">{e.placeHint}</span>
          </button>
        ))}
      </div>

      <div className="settings">
        <div className="setting">
          <span className="setting-label">{isHold ? 'Секунд' : 'Повторений'}</span>
          <div className="stepper">
            <button onClick={() => setTarget(settings.target - step)} aria-label="Меньше">
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step={step}
              value={draft ?? settings.target}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => setTarget(e.target.valueAsNumber)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <button onClick={() => setTarget(settings.target + step)} aria-label="Больше">
              +
            </button>
          </div>
        </div>

        <div className="setting">
          <span className="setting-label">Строгость</span>
          <div className="segmented">
            {STRICTNESS.map(({ value, label }) => (
              <button
                key={value}
                className={value === settings.strictness ? 'active' : ''}
                onClick={() => update({ strictness: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {settings.exerciseId === 'plank' && (
          <div className="setting">
            <span className="setting-label">Упор</span>
            <div className="segmented">
              {ARMS.map(({ value, label }) => (
                <button
                  key={value}
                  className={value === settings.plankArms ? 'active' : ''}
                  onClick={() => update({ plankArms: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          className="big-button"
          onClick={() => {
            // Если поле цели ещё в фокусе, его значение тоже применяется.
            const parsed = draft === null ? settings.target : Number(draft);
            const target = Number.isFinite(parsed)
              ? Math.min(max, Math.max(min, Math.round(parsed)))
              : settings.target;
            const final = { ...settings, target };
            saveSettings(final);
            onStart(final);
          }}
        >
          Начать
        </button>
      </div>
    </div>
  );
}
