import { GRADE_LEVEL } from './hay-constants';
import { sfiaSurplus } from './sfia-gap';
import type { Person } from './person';

const MS_PER_YEAR = 31557600000;

export const EMIRATIZATION_TARGET = 0.3;

export const gradeMid = (grade: string): number => {
  const L = GRADE_LEVEL[grade] || 3;
  return (6500 + L * 5200 + 1500) * 12;
};

export const compaRatio = (p: Person): number => p.sal / gradeMid(p.grade);

// now: injected, not Date.now(), for repro
export const tenureYears = (p: Person, now: Date = new Date()): number =>
  Math.max(0, (now.getTime() - new Date(p.startDate).getTime()) / MS_PER_YEAR);

// UAE gratuity: 21d/yr ≤5y, 30d/yr after, cap 24m
export function eosb(p: Person, now: Date = new Date()): number {
  const basicM = (p.sal * 0.6) / 12;
  const y = tenureYears(p, now);
  const g = y <= 5 ? basicM * (21 / 30) * y : basicM * (21 / 30) * 5 + basicM * (30 / 30) * (y - 5);
  return Math.round(Math.min(g, basicM * 24));
}

export const noticePay = (p: Person): number => Math.round(p.sal / 12);

// underpaid + overqualified
export const flightRisk = (
  p: Person,
  divName: string,
  subdivisionName: string,
  deptName: string
): boolean => compaRatio(p) < 0.97 && sfiaSurplus(p, divName, subdivisionName, deptName) >= 2;
