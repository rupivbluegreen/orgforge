import { noticePay, eosb, tenureYears } from './eosb';
import { sfiaDeficit } from './sfia-gap';
import { trainCost } from './sfia-catalogue';
import type { Person } from './person';

export type RestructuringAction = 'delete' | number;

export const selectVictims = (people: Person[], action: RestructuringAction): Person[] =>
  action === 'delete' ? people : people.slice(0, action);

export interface RedeploymentCandidate {
  deptName: string;
  divisionName: string;
  subdivisionName: string;
  hc: number;
  approvedHC: number;
  frozen: boolean;
}

export interface BestRedeployment {
  deptName: string;
  cost: number;
  gapPts: number;
}

export interface RestructuringRow {
  personId: string;
  personName: string;
  grade: string;
  tenureYears: number;
  noticePay: number;
  eosb: number;
  redundancyCost: number;
  bestRedeployment: BestRedeployment | null;
  recommendation: 'REDEPLOY' | 'REDUNDANCY';
}

export interface RestructuringModel {
  deptName: string;
  action: RestructuringAction;
  rows: RestructuringRow[];
  totalRedundancyCost: number;
  totalRedeploymentCost: number;
  recommendedSavings: number;
}

// redundancy vs SFIA redeployment cost
export function modelRestructuring(
  deptName: string,
  action: RestructuringAction,
  candidates: RedeploymentCandidate[],
  people: Person[],
  now: Date = new Date()
): RestructuringModel {
  const victims = selectVictims(people, action);
  const eligible = candidates.filter(
    (c) => c.deptName !== deptName && !c.frozen && c.approvedHC - c.hc >= 1
  );

  let totalRedundancyCost = 0;
  let totalRedeploymentCost = 0;

  const rows: RestructuringRow[] = victims.map((p) => {
    const redundancyCost = noticePay(p) + eosb(p, now);

    let best: BestRedeployment | null = null;
    for (const c of eligible) {
      const def = sfiaDeficit(p, c.divisionName, c.subdivisionName, c.deptName);
      const cost = def.det.reduce((a, g) => a + g.g * trainCost(g.c), 0);
      if (!best || cost < best.cost) best = { deptName: c.deptName, cost, gapPts: def.pts };
    }

    totalRedundancyCost += redundancyCost;
    totalRedeploymentCost += best ? best.cost : redundancyCost;

    return {
      personId: p.id,
      personName: p.name,
      grade: p.grade,
      tenureYears: tenureYears(p, now),
      noticePay: noticePay(p),
      eosb: eosb(p, now),
      redundancyCost,
      bestRedeployment: best,
      recommendation: best && best.cost < redundancyCost ? 'REDEPLOY' : 'REDUNDANCY',
    };
  });

  return {
    deptName,
    action,
    rows,
    totalRedundancyCost,
    totalRedeploymentCost,
    recommendedSavings: Math.max(0, totalRedundancyCost - Math.min(totalRedundancyCost, totalRedeploymentCost)),
  };
}

export interface DepartmentCapacity {
  hc: number;
  base: number;
  approvedHC: number;
  people: Person[];
}

export type ExecutionResult =
  | { type: 'delete' }
  | { type: 'downsize'; hc: number; base: number; approvedHC: number; removedPersonIds: string[] };

// Caller applies this to their own org model
export function applyRestructuring(dept: DepartmentCapacity, action: RestructuringAction): ExecutionResult {
  if (action === 'delete') return { type: 'delete' };
  const n = action;
  const cut = dept.people.slice(0, n);
  const newHc = Math.max(0, dept.hc - n);
  return {
    type: 'downsize',
    hc: newHc,
    base: Math.max(0, dept.base - cut.reduce((s, p) => s + p.sal, 0)),
    approvedHC: Math.max(newHc, dept.approvedHC - n),
    removedPersonIds: cut.map((p) => p.id),
  };
}
