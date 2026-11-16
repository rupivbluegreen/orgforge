import { bandMidpoint } from './hay-constants';
import { compaRatio } from './eosb';
import { CTC_MULTIPLE } from './cost';
import type { Person } from './person';

export interface PayLineFit {
  slope: number;
  intercept: number;
  n: number;
}

export const lineAt = (fit: PayLineFit, x: number): number => fit.intercept + fit.slope * x;

// OLS: salary vs Hay grade-band midpoint.
export function fitPayLine(people: Person[]): PayLineFit {
  const pts = people.map((p) => ({ x: bandMidpoint(p.grade), y: p.sal }));
  const n = pts.length;
  const sx = pts.reduce((a, d) => a + d.x, 0);
  const sy = pts.reduce((a, d) => a + d.y, 0);
  const sxy = pts.reduce((a, d) => a + d.x * d.y, 0);
  const sxx = pts.reduce((a, d) => a + d.x * d.x, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept, n };
}

export interface PayOutlier {
  person: Person;
  fitted: number;
  deviation: number;
}

// |actual-line|/line > 20%, sorted worst-first
export function findOutliers(people: Person[], fit: PayLineFit): PayOutlier[] {
  return people
    .map((person) => {
      const fitted = lineAt(fit, bandMidpoint(person.grade));
      return { person, fitted, deviation: (person.sal - fitted) / fitted };
    })
    .filter((d) => Math.abs(d.deviation) > 0.2)
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
}

export interface GradeBandRow {
  grade: string;
  hayMid: number;
  min: number;
  mid: number;
  max: number;
  incumbents: number;
  // vs fitted line, not eosb.ts's gradeMid anchor
  avgVsLine: number;
}

export function gradeBandTable(people: Person[], fit: PayLineFit): GradeBandRow[] {
  const grades = [...new Set(people.map((p) => p.grade))].sort(
    (g1, g2) => bandMidpoint(g1) - bandMidpoint(g2)
  );
  return grades.map((grade) => {
    const mid = lineAt(fit, bandMidpoint(grade));
    const incumbents = people.filter((p) => p.grade === grade);
    const avgVsLine = incumbents.reduce((s, p) => s + p.sal / mid, 0) / incumbents.length;
    return { grade, hayMid: bandMidpoint(grade), min: mid * 0.8, mid, max: mid * 1.2, incumbents: incumbents.length, avgVsLine };
  });
}

export type GradeBucket = 'C' | 'P' | 'M/E';

export const bucketOf = (grade: string): GradeBucket =>
  grade[0] === 'C' ? 'C' : grade[0] === 'P' ? 'P' : 'M/E';

export interface EquityCell {
  divisionName: string;
  bucket: GradeBucket;
  avgCompaRatio: number | null;
  count: number;
}

const BUCKETS: GradeBucket[] = ['C', 'P', 'M/E'];

export function equityHeatMap(
  records: { person: Person; divisionName: string }[],
  divisionNames: string[]
): EquityCell[] {
  const cells: EquityCell[] = [];
  divisionNames.forEach((divisionName) => {
    BUCKETS.forEach((bucket) => {
      const set = records.filter((r) => r.divisionName === divisionName && bucketOf(r.person.grade) === bucket);
      if (!set.length) {
        cells.push({ divisionName, bucket, avgCompaRatio: null, count: 0 });
        return;
      }
      const avgCompaRatio = set.reduce((s, r) => s + compaRatio(r.person), 0) / set.length;
      cells.push({ divisionName, bucket, avgCompaRatio, count: set.length });
    });
  });
  return cells;
}

export const DEFAULT_MERIT_MATRIX: number[][] = [
  [0, 0, 0],
  [2, 1.5, 1],
  [4, 3, 2.5],
  [6, 5, 4],
  [8, 7, 5.5],
];

export const meritTertile = (p: Person): 0 | 1 | 2 => {
  const cr = compaRatio(p);
  return cr < 0.95 ? 0 : cr <= 1.05 ? 1 : 2;
};

export interface MeritProjection {
  currentPayroll: number;
  incrementCost: number;
  projectedCtc: number;
}

export function projectMerit(people: Person[], merit: number[][] = DEFAULT_MERIT_MATRIX): MeritProjection {
  let currentPayroll = 0;
  let incrementCost = 0;
  people.forEach((p) => {
    currentPayroll += p.sal + p.allow;
    incrementCost += p.sal * (merit[p.perf - 1][meritTertile(p)] / 100);
  });
  return {
    currentPayroll,
    incrementCost,
    projectedCtc: Math.round((currentPayroll + incrementCost) * CTC_MULTIPLE),
  };
}
