export type PerfRating = 1 | 2 | 3 | 4 | 5;

export interface PerfScaleEntry {
  rating: PerfRating;
  label: string;
  anchor: string;
  route: string;
}

// PRD 5.9 rating scale, behavioural anchors
export const PERF_SCALE: PerfScaleEntry[] = [
  { rating: 1, label: 'Unsatisfactory', anchor: 'Consistently misses agreed objectives and role standards despite feedback; behaviours fall short of bank values or control expectations.', route: 'PIP — 90 days, defined exit criteria. No merit; variable pay withheld.' },
  { rating: 2, label: 'Developing', anchor: 'Meets some but not all objectives; capability or behavioural gaps limit full delivery of the role.', route: 'Development plan toward rating 3 (12 months). Reduced merit.' },
  { rating: 3, label: 'Solid Performer', anchor: 'Fully meets the objectives and standards of the role; reliable delivery within own scope; competent against the SFIA profile.', route: 'Development plan toward rating 4 — broaden scope, raise impact. Standard merit.' },
  { rating: 4, label: 'Exceeds Expectations', anchor: 'Consistently delivers beyond agreed objectives; visibly lifts team or cross-functional outcomes; role-models bank values.', route: 'Development plan toward rating 5 — enterprise impact, succession readiness. Above-standard merit; talent pool.' },
  { rating: 5, label: 'Outstanding', anchor: 'Exceptional, sustained impact well beyond the role; shapes results at department or bank level; benchmark for others.', route: 'Sustain-and-stretch plan; succession slating for critical roles; top-quartile merit and bonus.' },
];

export const PERF_GUIDE: Record<PerfRating, number> = { 1: 5, 2: 15, 3: 50, 4: 22, 5: 8 };

export const perfLabel = (rating: PerfRating): string => PERF_SCALE[rating - 1].label;

export const perfTrack = (rating: PerfRating): string =>
  rating === 1 ? 'PIP · 90 days' : rating === 5 ? 'Sustain & Stretch' : `Dev plan ${rating} → ${rating + 1}`;

export const perfStream = (grade: string): string =>
  grade[0] === 'C' ? 'Operations' : grade[0] === 'P' ? 'Professional' : grade[0] === 'M' ? 'Management' : 'Executive';

// FR-PRF-04: 1->PIP-01, 5->STR-01, else family id
export function perfPlanId(perf: PerfRating, grade: string): string {
  if (perf === 1) return 'PIP-01';
  if (perf === 5) return 'STR-01';
  const prefix = grade[0] === 'C' ? 'OPS' : grade[0] === 'P' ? 'PRO' : grade[0] === 'M' ? 'MGR' : 'EXE';
  return `${prefix}-${perf}-${perf + 1}`;
}

export interface CalibrationRow {
  rating: PerfRating;
  count: number;
  pct: number;
  guidelinePct: number;
}

export interface Calibration {
  countByRating: Record<PerfRating, number>;
  averageRating: number;
  onDevelopmentPlan: number;
  rows: CalibrationRow[];
}

// FR-PRF-01/02: KPI cards + distribution
export function computeCalibration(ratings: PerfRating[]): Calibration {
  const countByRating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<PerfRating, number>;
  ratings.forEach((r) => { countByRating[r]++; });
  const n = ratings.length;
  const averageRating = n ? ratings.reduce((a, r) => a + r, 0) / n : 0;
  const onDevelopmentPlan = countByRating[2] + countByRating[3] + countByRating[4];
  const rows: CalibrationRow[] = ([1, 2, 3, 4, 5] as PerfRating[]).map((rating) => ({
    rating,
    count: countByRating[rating],
    pct: n ? (100 * countByRating[rating]) / n : 0,
    guidelinePct: PERF_GUIDE[rating],
  }));
  return { countByRating, averageRating, onDevelopmentPlan, rows };
}

// FR-PRF-05: a rating change recalcs plan + track
export interface RatingChangeResult {
  previousRating: PerfRating;
  newRating: PerfRating;
  planId: string;
  track: string;
}

export function applyRatingChange(previousRating: PerfRating, newRating: PerfRating, grade: string): RatingChangeResult {
  return { previousRating, newRating, planId: perfPlanId(newRating, grade), track: perfTrack(newRating) };
}
