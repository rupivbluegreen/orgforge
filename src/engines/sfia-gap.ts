import { requiredTechProfile } from './sfia-catalogue';

export interface SfiaPerson {
  grade: string;
  skills: Record<string, number>;
}

export interface GapStats {
  short: number;
  gapPts: number;
  reqCnt: number;
  ready: number;
}

export function gapStats(
  people: SfiaPerson[],
  divName: string,
  subdivisionName: string,
  deptName: string
): GapStats {
  let short = 0;
  let gapPts = 0;
  let reqCnt = 0;
  people.forEach((p) => {
    const req = requiredTechProfile(divName, subdivisionName, deptName, p.grade);
    Object.entries(req).forEach(([c, l]) => {
      reqCnt++;
      const g = l - (p.skills[c] || 0);
      if (g > 0) { short++; gapPts += g; }
    });
  });
  return { short, gapPts, reqCnt, ready: reqCnt ? Math.round(100 * (1 - short / reqCnt)) : 100 };
}

export function sfiaSurplus(
  p: SfiaPerson,
  divName: string,
  subdivisionName: string,
  deptName: string
): number {
  const req = requiredTechProfile(divName, subdivisionName, deptName, p.grade);
  let s = 0;
  Object.entries(req).forEach(([c, l]) => { s += Math.max(0, (p.skills[c] || 0) - l); });
  Object.entries(p.skills).forEach(([c, l]) => {
    if (!(c in req)) s += Math.min(2, l / 3);
  });
  return Math.round(s);
}

export interface SfiaDeficitEntry {
  c: string;
  g: number;
  req: number;
  have: number;
}

export function sfiaDeficit(
  p: SfiaPerson,
  divName: string,
  subdivisionName: string,
  deptName: string,
  grade?: string
): { pts: number; det: SfiaDeficitEntry[] } {
  const req = requiredTechProfile(divName, subdivisionName, deptName, grade || p.grade);
  let s = 0;
  const det: SfiaDeficitEntry[] = [];
  Object.entries(req).forEach(([c, l]) => {
    const g = l - (p.skills[c] || 0);
    if (g > 0) { s += g; det.push({ c, g, req: l, have: p.skills[c] || 0 }); }
  });
  return { pts: s, det: det.sort((a, b) => b.g - a.g) };
}
