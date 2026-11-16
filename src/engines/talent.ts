import { GRADE_LEVEL } from './hay-constants';
import { sfiaSurplus, sfiaDeficit } from './sfia-gap';
import type { SfiaDeficitEntry } from './sfia-gap';
import { trainCost } from './sfia-catalogue';
import type { Person } from './person';

// PRD §5.10 9-box: perf x SFIA-surplus potential
export type PerfBucket = 0 | 1 | 2;
export type PotentialBucket = 0 | 1 | 2;

export const perfBucket = (perf: number): PerfBucket => (perf <= 2 ? 0 : perf === 3 ? 1 : 2);
export const potentialBucket = (surplus: number): PotentialBucket => (surplus <= 0 ? 0 : surplus <= 2 ? 1 : 2);

// [potentialBucket][perfBucket]
export const NINE_BOX_LABELS: string[][] = [
  ['Underperformer', 'Effective specialist', 'High professional'],
  ['Inconsistent', 'Core performer', 'High performer'],
  ['Rough diamond', 'Growth talent', 'STAR — future leader'],
];

export interface NineBoxRecord {
  person: Person;
  deptName: string;
  divName: string;
  subdivisionName: string;
}

export interface NineBoxOccupant {
  personId: string;
  personName: string;
  grade: string;
  deptName: string;
}

export interface NineBoxCell {
  potentialBucket: PotentialBucket;
  perfBucket: PerfBucket;
  label: string;
  occupants: NineBoxOccupant[];
}

export function buildNineBox(records: NineBoxRecord[]): NineBoxCell[] {
  const cells: NineBoxCell[] = [];
  for (let pot = 0; pot <= 2; pot++) {
    for (let perf = 0; perf <= 2; perf++) {
      const occupants = records
        .filter(
          (r) =>
            perfBucket(r.person.perf) === perf &&
            potentialBucket(sfiaSurplus(r.person, r.divName, r.subdivisionName, r.deptName)) === pot
        )
        .map((r) => ({ personId: r.person.id, personName: r.person.name, grade: r.person.grade, deptName: r.deptName }));
      cells.push({
        potentialBucket: pot as PotentialBucket,
        perfBucket: perf as PerfBucket,
        label: NINE_BOX_LABELS[pot][perf],
        occupants,
      });
    }
  }
  return cells;
}

// PRD §5.10 succession: ranked bench
export interface CriticalRole {
  deptName: string;
  divName: string;
  subdivisionName: string;
  hayTotal: number;
}

export function identifyCriticalRoles(roles: CriticalRole[], topN = 6): CriticalRole[] {
  return [...roles].sort((a, b) => b.hayTotal - a.hayTotal).slice(0, topN);
}

export interface SuccessionCandidateInput {
  person: Person;
  deptName: string;
}

export interface SuccessionCandidate {
  personId: string;
  personName: string;
  grade: string;
  deptName: string;
  readiness: number;
  gapPts: number;
}

// eligible: level>=5 or perf>=4
export function successionBench(role: CriticalRole, candidates: SuccessionCandidateInput[], topN = 3): SuccessionCandidate[] {
  return candidates
    .filter((c) => (GRADE_LEVEL[c.person.grade] ?? 0) >= 5 || c.person.perf >= 4)
    .map((c) => {
      const def = sfiaDeficit(c.person, role.divName, role.subdivisionName, role.deptName, 'M2');
      const readiness = Math.max(5, Math.min(98, 100 - def.pts * 9 - (5 - c.person.perf) * 6));
      return { personId: c.person.id, personName: c.person.name, grade: c.person.grade, deptName: c.deptName, readiness, gapPts: def.pts };
    })
    .sort((a, b) => b.readiness - a.readiness)
    .slice(0, topN);
}

// PRD §5.10 mobility marketplace
export interface MobilityTarget {
  deptName: string;
  divName: string;
  subdivisionName: string;
}

export interface MobilityResult {
  fromDept: string;
  toDept: string;
  readiness: number;
  bridgeCost: number;
  gapPts: number;
  months: number;
  transitionLabel: string;
  viableDirectMove: boolean;
  deficits: SfiaDeficitEntry[];
}

export function modelMobility(person: Person, fromDeptName: string, target: MobilityTarget): MobilityResult | null {
  if (fromDeptName === target.deptName) return null;
  const def = sfiaDeficit(person, target.divName, target.subdivisionName, target.deptName);
  const readiness = Math.max(5, 100 - def.pts * 8);
  const bridgeCost = def.det.reduce((a, g) => a + g.g * trainCost(g.c), 0);
  const months = Math.min(24, Math.ceil(def.pts * 1.5));
  const viableDirectMove = def.pts <= 16;
  const transitionLabel = def.pts === 0 ? 'Immediate' : !viableDirectMove ? '>24 mo' : `${months} mo`;
  return { fromDept: fromDeptName, toDept: target.deptName, readiness, bridgeCost, gapPts: def.pts, months, transitionLabel, viableDirectMove, deficits: def.det };
}

// PRD §5.10 budget, priced per SFIA level closed
export interface LearningBudgetRecord {
  person: Person;
  deptName: string;
  divName: string;
  subdivisionName: string;
}

export interface LearningBudgetRow {
  divisionName: string;
  cost: number;
  gapPts: number;
}

export interface LearningBudget {
  total: number;
  rows: LearningBudgetRow[];
}

export function learningBudgetByDivision(records: LearningBudgetRecord[]): LearningBudget {
  const byDiv = new Map<string, { cost: number; gapPts: number }>();
  for (const r of records) {
    const def = sfiaDeficit(r.person, r.divName, r.subdivisionName, r.deptName);
    const cost = def.det.reduce((a, g) => a + g.g * trainCost(g.c), 0);
    const entry = byDiv.get(r.divName) ?? { cost: 0, gapPts: 0 };
    entry.cost += cost;
    entry.gapPts += def.pts;
    byDiv.set(r.divName, entry);
  }
  const rows = [...byDiv.entries()]
    .map(([divisionName, v]) => ({ divisionName, ...v }))
    .sort((a, b) => b.cost - a.cost);
  return { total: rows.reduce((a, r) => a + r.cost, 0), rows };
}
