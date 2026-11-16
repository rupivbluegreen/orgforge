import type { DepartmentInput, HayEvaluation, OrgModel } from './types';
import { HAY_STEPS, stepAt, nearestStep, gradeFor, bandMidpoint, divHeadcount, divBase, GRADE_LEVEL } from './hay-constants';
import { streamOf } from './streams';
import { fmtAED } from './format';

export interface IndicativeHayEvaluation {
  kh: { pts: number; note: string };
  ps: { pts: number; note: string };
  acc: { pts: number; note: string };
  total: number;
  grade: string;
  indicative: true;
}

export const HayEngine = {
  evaluate(dept: DepartmentInput, model: OrgModel): HayEvaluation {
    const div = model.divisions.find((d) => d.name === dept._division);
    if (!div) throw new Error(`Division not found: ${dept._division}`);
    const sub = div.subdivisions.find((s) => s.name === dept._subdivision);
    if (!sub) throw new Error(`Sub-division not found: ${dept._subdivision}`);
    const st = streamOf(sub.name);
    const divHC = divHeadcount(div);
    const divCost = divBase(div);
    const divDeptCount = div.subdivisions.reduce((a, s) => a + s.departments.length, 0);

    let khIdx: number;
    let khTech: string;
    if (dept.hc >= 150) { khTech = 'F'; khIdx = 15; }
    else if (dept.hc >= 60) { khTech = 'E+'; khIdx = 14; }
    else { khTech = 'E'; khIdx = 13; }
    let khBreadth: string;
    if (divDeptCount >= 6) { khBreadth = 'III'; khIdx += 2; }
    else if (divDeptCount >= 3) { khBreadth = 'II'; khIdx += 1; }
    else { khBreadth = 'I'; }
    const khHR = '3';
    khIdx += 1;
    const khPts = stepAt(khIdx);

    const chall = divCost >= 120e6 ? 4 : 3;
    const psEnv = st.psEnv + chall;
    const psPct = Math.min(0.5, st.psBase + (chall === 4 ? 0.05 : 0));
    const psPts = nearestStep(psPct * khPts);

    const accFreedom = dept.hc >= 100 ? 'E' : 'D';
    let accIdx = accFreedom === 'E' ? 13 : 11;
    const cost = dept.base;
    let mag: string;
    if (cost >= 25e6) { mag = '3'; accIdx += 2; }
    else if (cost >= 12e6) { mag = '2'; accIdx += 1; }
    else { mag = '1'; }
    if (divCost >= 150e6) accIdx += 1;
    if (st.impact === 'P') accIdx += 1;
    else if (st.impact === 'C') accIdx -= 1;
    else if (st.impact === 'R') accIdx -= 2;
    const accPts = stepAt(accIdx);

    const total = khPts + psPts + accPts;

    return {
      job: `Head of ${dept.department}`,
      kh: { tech: khTech, breadth: khBreadth, hr: khHR, pts: khPts, note: `${khTech}·${khBreadth}·${khHR} — unit ${dept.hc} HC in ${divDeptCount}-dept division` },
      ps: { env: psEnv, pct: psPct, pts: psPts, note: `${psEnv} · ${(psPct * 100).toFixed(0)}% of KH — ${sub.name}` },
      acc: { freedom: accFreedom, mag, impact: st.impact, pts: accPts, note: `${accFreedom}·${mag}·${st.impact} (${st.impactLbl}) — ${fmtAED(cost)} unit cost` },
      total,
      grade: gradeFor(total),
      context: { divHC, divCost, stream: sub.name, divDeptCount },
    };
  },

  // Incumbent split, not a committee eval
  indicative(grade: string, familyName: string): IndicativeHayEvaluation {
    const st = streamOf(familyName);
    const mid = bandMidpoint(grade);
    const kh = nearestStep(mid * 0.46);
    const ps = nearestStep(kh * st.psBase);
    const acc = nearestStep(Math.max(HAY_STEPS[0], mid - kh - ps));
    const total = kh + ps + acc;
    const L = GRADE_LEVEL[grade] || 3;
    return {
      kh: { pts: kh, note: `Indicative at grade ${grade} — SFIA responsibility level ${L}` },
      ps: { pts: ps, note: `${(st.psBase * 100).toFixed(0)}% of KH — ${familyName} thinking environment` },
      acc: { pts: acc, note: `${st.impactLbl} impact on end results` },
      total,
      grade,
      indicative: true,
    };
  },
};
