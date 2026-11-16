import { compaRatio, tenureYears, eosb, flightRisk } from './eosb';
import { sfiaDeficit, sfiaSurplus } from './sfia-gap';
import { SFIA } from './sfia-catalogue';
import { perfLabel, perfPlanId } from './perf';
import { PERF_PLANS } from './perf-plans';
import type { PerfPlan } from './perf-plans';
import type { PerfRating } from './perf';
import type { Person } from './person';

export interface SfiaGapContext {
  skill: string;
  code: string;
  have: number;
  required: number;
}

export interface GeneratorContext {
  id: string;
  name: string;
  job: string;
  grade: string;
  department: string;
  division: string;
  annual_base_AED: number;
  allowances_AED: number;
  compa_ratio: number;
  performance_rating: PerfRating;
  rating_label: string;
  dev_plan: string;
  plan?: PerfPlan;
  tenure_years: number;
  nationality: string;
  flight_risk: boolean;
  sfia_surplus_pts: number;
  sfia_gaps: SfiaGapContext[];
  eosb_today_AED: number;
}

// shared person-scoped generator context
export function buildPersonContext(
  person: Person,
  divName: string,
  subdivisionName: string,
  deptName: string,
  now: Date = new Date()
): GeneratorContext {
  const cr = compaRatio(person);
  const def = sfiaDeficit(person, divName, subdivisionName, deptName);
  const sur = sfiaSurplus(person, divName, subdivisionName, deptName);
  const planId = perfPlanId(person.perf as PerfRating, person.grade);
  return {
    id: person.id,
    name: person.name,
    job: person.job,
    grade: person.grade,
    department: deptName,
    division: divName,
    annual_base_AED: person.sal,
    allowances_AED: person.allow,
    compa_ratio: Number(cr.toFixed(2)),
    performance_rating: person.perf as PerfRating,
    rating_label: perfLabel(person.perf as PerfRating),
    dev_plan: planId,
    plan: PERF_PLANS[planId],
    tenure_years: Number(tenureYears(person, now).toFixed(1)),
    nationality: person.nationality,
    flight_risk: flightRisk(person, divName, subdivisionName, deptName),
    sfia_surplus_pts: sur,
    sfia_gaps: def.det.slice(0, 5).map((g) => ({
      skill: SFIA.skills[g.c]?.name || g.c,
      code: g.c,
      have: g.have,
      required: g.req,
    })),
    eosb_today_AED: Math.round(eosb(person, now)),
  };
}
