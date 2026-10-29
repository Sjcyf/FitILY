// Сглаживание значений (углов) по кадрам, чтобы дрожание точек не давало ложных повторений.

export interface Filter {
  // t — время кадра в мс. NaN во входе пропускается: возвращается последнее значение.
  next(value: number, t: number): number;
  reset(): void;
}

// Скользящее среднее по последним `size` кадрам.
export class MovingAverage implements Filter {
  private values: number[] = [];
  private readonly size: number;

  constructor(size = 5) {
    this.size = size;
  }

  next(value: number): number {
    if (!Number.isNaN(value)) {
      this.values.push(value);
      if (this.values.length > this.size) this.values.shift();
    }
    if (this.values.length === 0) return NaN;
    return this.values.reduce((s, v) => s + v, 0) / this.values.length;
  }

  reset(): void {
    this.values = [];
  }
}

// One Euro filter (Casiez et al., 2012): сильно сглаживает, когда значение почти
// не меняется, и почти не запаздывает при быстром движении. Устойчив к плавающему FPS.
export class OneEuroFilter implements Filter {
  private prevValue = NaN;
  private prevDeriv = 0;
  private prevT = NaN;
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;

  constructor(minCutoff = 1.0, beta = 0.02, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  next(value: number, t: number): number {
    if (Number.isNaN(value)) return this.prevValue;
    if (Number.isNaN(this.prevValue) || t <= this.prevT) {
      this.prevValue = value;
      this.prevT = t;
      return value;
    }
    const dt = (t - this.prevT) / 1000;
    const deriv = (value - this.prevValue) / dt;
    const smoothDeriv = lerp(this.prevDeriv, deriv, alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(smoothDeriv);
    const smoothed = lerp(this.prevValue, value, alpha(cutoff, dt));

    this.prevValue = smoothed;
    this.prevDeriv = smoothDeriv;
    this.prevT = t;
    return smoothed;
  }

  reset(): void {
    this.prevValue = NaN;
    this.prevDeriv = 0;
    this.prevT = NaN;
  }
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

// Сглаживает набор именованных значений: для каждого ключа свой фильтр.
export class MetricsSmoother<K extends string> {
  private filters = new Map<K, Filter>();
  private readonly makeFilter: () => Filter;

  constructor(makeFilter: () => Filter = () => new MovingAverage(5)) {
    this.makeFilter = makeFilter;
  }

  next(metrics: Record<K, number>, t: number): Record<K, number> {
    const out = {} as Record<K, number>;
    for (const key of Object.keys(metrics) as K[]) {
      let filter = this.filters.get(key);
      if (!filter) {
        filter = this.makeFilter();
        this.filters.set(key, filter);
      }
      out[key] = filter.next(metrics[key], t);
    }
    return out;
  }

  reset(): void {
    this.filters.clear();
  }
}
