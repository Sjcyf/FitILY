import type { Figure } from '../exercises/registry';

// Схематичный человечек сбоку: иконка на карточке и контур «встань сюда» на экране подготовки.
// Рисуется линиями currentColor, поэтому цвет и пунктир задаются снаружи через CSS.

const FIGURES: Record<Figure, { head: [number, number]; lines: string }> = {
  // Стоит боком.
  standing: {
    head: [60, 12],
    lines: 'M60 19 L60 46 M60 46 L58 62 L60 76 M60 24 L64 36 L62 46 M44 77 L76 77',
  },
  // Упор лёжа на прямых руках.
  pushup: {
    head: [98, 28],
    lines: 'M90 34 L52 44 L14 54 M90 34 L90 56 M8 57 L112 57',
  },
  // Лёжа на спине, ноги согнуты, корпус приподнят.
  situp: {
    head: [24, 34],
    lines: 'M30 40 L52 58 M52 58 L72 38 L92 58 M30 42 L44 46 M8 59 L112 59',
  },
  // Планка на предплечьях.
  plank: {
    head: [100, 34],
    lines: 'M92 40 L52 47 L14 54 M92 40 L92 56 L108 56 M8 57 L112 57',
  },
};

interface Props {
  figure: Figure;
  className?: string;
}

export function ExerciseFigure({ figure, className }: Props) {
  const { head, lines } = FIGURES[figure];
  return (
    <svg className={className} viewBox="0 0 120 80" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={head[0]} cy={head[1]} r="6" />
        <path d={lines} />
      </g>
    </svg>
  );
}
