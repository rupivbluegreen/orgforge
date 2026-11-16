import type { DivisionModel } from './types';

export const HAY_STEPS = [
  50, 57, 66, 76, 87, 100, 115, 132, 152, 175, 200, 230, 264, 304, 350,
  400, 460, 528, 608, 700, 800, 920, 1056, 1216, 1400,
] as const;

export const stepAt = (i: number): number =>
  HAY_STEPS[Math.max(0, Math.min(HAY_STEPS.length - 1, i))];

export const nearestStep = (v: number): number =>
  HAY_STEPS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

export const GRADE_LADDER: [number, string][] = [
  [1850, 'E1'], [1500, 'E2'], [1180, 'E3'], [920, 'M1'], [780, 'M2'], [660, 'M3'],
  [560, 'P1'], [460, 'P2'], [390, 'P3'], [300, 'P4'], [230, 'C1'], [195, 'C2'], [0, 'C3'],
];

export const gradeFor = (pts: number): string => {
  const hit = GRADE_LADDER.find(([min]) => pts >= min);
  if (!hit) throw new Error(`No grade band covers ${pts} points`);
  return hit[1];
};

export const bandMidpoint = (grade: string): number => {
  const i = GRADE_LADDER.findIndex(([, g]) => g === grade);
  if (i < 0) return 400;
  const lo = GRADE_LADDER[i][0];
  const hi = i > 0 ? GRADE_LADDER[i - 1][0] : GRADE_LADDER[0][0] * 1.2;
  return Math.round((Math.max(lo, 150) + hi) / 2);
};

export const GRADE_LEVEL: Record<string, number> = {
  C1: 1, C2: 2, C3: 3, P1: 3, P2: 4, P3: 4, P4: 5,
  M1: 5, M2: 5, M3: 6, E3: 6, E2: 6, E1: 7,
};

export const levelOf = (grade: string): number => GRADE_LEVEL[grade] ?? 0;

export const divHeadcount = (d: DivisionModel): number =>
  d.subdivisions.reduce((a, s) => a + s.departments.reduce((b, x) => b + x.hc, 0), 0);

export const divBase = (d: DivisionModel): number =>
  d.subdivisions.reduce((a, s) => a + s.departments.reduce((b, x) => b + x.base, 0), 0);
