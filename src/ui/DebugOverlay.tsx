import type { BodyMetricKey, BodyMetrics } from '../pose/bodyMetrics';
import type { Side } from '../pose/side';

export interface DebugData {
  side: Side;
  visibility: Record<Side, number>;
  raw: BodyMetrics;
  smoothed: BodyMetrics;
}

const ROWS: { key: BodyMetricKey; label: string; unit: '°' | '%' }[] = [
  { key: 'elbow', label: 'Локоть', unit: '°' },
  { key: 'knee', label: 'Колено', unit: '°' },
  { key: 'hip', label: 'Таз (плечо–таз–колено)', unit: '°' },
  { key: 'bodyLine', label: 'Линия тела (плечо–таз–щиколотка)', unit: '°' },
  { key: 'torsoToHorizontal', label: 'Корпус к горизонту', unit: '°' },
  { key: 'torsoToVertical', label: 'Корпус к вертикали', unit: '°' },
  { key: 'bodyToHorizontal', label: 'Тело к горизонту', unit: '°' },
  { key: 'hipOffset', label: 'Таз от линии (+ провис)', unit: '%' },
];

function format(value: number, unit: '°' | '%'): string {
  if (!Number.isFinite(value)) return '—';
  return unit === '%' ? `${(value * 100).toFixed(0)}%` : `${value.toFixed(0)}°`;
}

export function DebugOverlay({ data }: { data: DebugData | null }) {
  return (
    <div className="debug">
      {data ? (
        <>
          <div className="debug-head">
            Сторона: <b>{data.side === 'left' ? 'левая' : 'правая'}</b> · видимость Л{' '}
            {data.visibility.left.toFixed(2)} / П {data.visibility.right.toFixed(2)}
          </div>
          <table>
            <thead>
              <tr>
                <th />
                <th>сглаж.</th>
                <th>сырое</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ key, label, unit }) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td className="debug-value">{format(data.smoothed[key], unit)}</td>
                  <td className="debug-raw">{format(data.raw[key], unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="debug-head">Человек не найден</div>
      )}
    </div>
  );
}
