import { describe, it, expect } from 'vitest';
import {
  perfBucket, potentialBucket, buildNineBox,
  identifyCriticalRoles, successionBench,
  modelMobility, learningBudgetByDivision,
} from '../src/engines/talent';
import type { NineBoxRecord, CriticalRole, SuccessionCandidateInput, LearningBudgetRecord } from '../src/engines/talent';
import type { Person } from '../src/engines/person';

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: 'EMP-1', name: 'Test Person', grade: 'M2', job: 'Head of Legal',
    skills: {}, behaviours: {}, sal: 480000, allow: 168000, startDate: '2020-01-01',
    nationality: 'Expat', perf: 3,
    ...overrides,
  };
}

const LEGAL = { deptName: 'Legal', divName: 'Support Functions', subdivisionName: 'Risk & Control Functions' };
const LEGAL_M2_PROFILE = { RSKM: 5, GOVN: 5, AMLC: 5, DAAN: 4, AUDT: 4, PEDP: 4 };

describe('perfBucket / potentialBucket', () => {
  it('buckets performance 1-2 / 3 / 4-5', () => {
    expect(perfBucket(1)).toBe(0); expect(perfBucket(2)).toBe(0);
    expect(perfBucket(3)).toBe(1);
    expect(perfBucket(4)).toBe(2); expect(perfBucket(5)).toBe(2);
  });
  it('buckets SFIA surplus 0- / 1-2 / 3+', () => {
    expect(potentialBucket(0)).toBe(0); expect(potentialBucket(-3)).toBe(0);
    expect(potentialBucket(1)).toBe(1); expect(potentialBucket(2)).toBe(1);
    expect(potentialBucket(3)).toBe(2); expect(potentialBucket(15)).toBe(2);
  });
});

describe('buildNineBox (PRD §5.10)', () => {
  it('places a STAR (high perf, high surplus) and an Underperformer (low perf, no surplus) correctly', () => {
    const star = person({ id: 'star', perf: 5, skills: { RSKM: 7, GOVN: 7, AMLC: 7, DAAN: 7, AUDT: 7, PEDP: 7 } });
    const under = person({ id: 'under', perf: 1, skills: {} });
    const records: NineBoxRecord[] = [
      { person: star, ...LEGAL },
      { person: under, ...LEGAL },
    ];
    const cells = buildNineBox(records);

    const starCell = cells.find((c) => c.potentialBucket === 2 && c.perfBucket === 2)!;
    expect(starCell.label).toBe('STAR — future leader');
    expect(starCell.occupants.map((o) => o.personId)).toEqual(['star']);

    const underCell = cells.find((c) => c.potentialBucket === 0 && c.perfBucket === 0)!;
    expect(underCell.label).toBe('Underperformer');
    expect(underCell.occupants.map((o) => o.personId)).toEqual(['under']);

    expect(cells).toHaveLength(9);
  });
});

describe('identifyCriticalRoles / successionBench (PRD §5.10)', () => {
  it('ranks roles by Hay total, takes topN', () => {
    const roles: CriticalRole[] = [
      { deptName: 'Legal', divName: 'x', subdivisionName: 'y', hayTotal: 810 },
      { deptName: 'Finance', divName: 'x', subdivisionName: 'y', hayTotal: 950 },
      { deptName: 'HR', divName: 'x', subdivisionName: 'y', hayTotal: 600 },
    ];
    expect(identifyCriticalRoles(roles, 2).map((r) => r.deptName)).toEqual(['Finance', 'Legal']);
  });

  it('excludes ineligible candidates, ranks eligible ones by readiness', () => {
    const role: CriticalRole = { ...LEGAL, hayTotal: 810 };
    const candidates: SuccessionCandidateInput[] = [
      { person: person({ id: 'c1', grade: 'M1', perf: 4, skills: LEGAL_M2_PROFILE }), deptName: 'X' },
      { person: person({ id: 'c2', grade: 'C2', perf: 3, skills: {} }), deptName: 'Y' }, // ineligible
      { person: person({ id: 'c3', grade: 'C3', perf: 4, skills: {} }), deptName: 'Z' }, // eligible via perf
    ];
    const bench = successionBench(role, candidates);

    expect(bench.map((b) => b.personId)).toEqual(['c1', 'c3']);
    expect(bench[0]).toMatchObject({ personId: 'c1', readiness: 94, gapPts: 0 });
    expect(bench[1]).toMatchObject({ personId: 'c3', readiness: 5, gapPts: 27 });
  });
});

describe('modelMobility (PRD §5.10)', () => {
  const complianceAndAml = { deptName: 'Compliance & AML', divName: 'Support Functions', subdivisionName: 'Risk & Control Functions' };

  it('returns null when target equals current department', () => {
    expect(modelMobility(person(), 'Legal', { ...LEGAL })).toBeNull();
  });

  it('prices a small, viable gap as a short transition', () => {
    const p = person({ skills: LEGAL_M2_PROFILE });
    const result = modelMobility(p, 'Legal', complianceAndAml);
    expect(result).toMatchObject({
      fromDept: 'Legal', toDept: 'Compliance & AML',
      readiness: 92, bridgeCost: 4500, gapPts: 1, months: 2,
      transitionLabel: '2 mo', viableDirectMove: true,
    });
  });

  it('flags a large gap (>16 pts) as not directly viable', () => {
    const p = person({ skills: {} }); // fully unqualified for Legal's own profile
    const result = modelMobility(p, 'Some Other Dept', LEGAL);
    expect(result!.gapPts).toBe(27);
    expect(result!.viableDirectMove).toBe(false);
    expect(result!.transitionLabel).toBe('>24 mo');
  });

  it('reports Immediate for a fully-adjacent (zero-gap) move', () => {
    const p = person({ skills: LEGAL_M2_PROFILE });
    const result = modelMobility(p, 'Some Other Dept', LEGAL);
    expect(result!.gapPts).toBe(0);
    expect(result!.transitionLabel).toBe('Immediate');
    expect(result!.readiness).toBe(100);
  });
});

describe('learningBudgetByDivision (PRD §5.10)', () => {
  it('aggregates cost/gapPts per division, sorted by cost, using own-grade profile', () => {
    const p1 = person({ id: 'p1', skills: {} }); // 105,500 vs Legal's own M2 profile
    const records: LearningBudgetRecord[] = [{ person: p1, ...LEGAL }];
    const budget = learningBudgetByDivision(records);

    expect(budget.rows).toEqual([{ divisionName: 'Support Functions', cost: 105500, gapPts: 27 }]);
    expect(budget.total).toBe(105500);
  });

  it('sums multiple people in the same division and sorts across divisions', () => {
    const cheap = person({ id: 'cheap', skills: LEGAL_M2_PROFILE }); // 0 cost
    const expensive = person({ id: 'expensive', skills: {} }); // 105,500
    const records: LearningBudgetRecord[] = [
      { person: cheap, ...LEGAL },
      { person: expensive, divName: 'Other Division', subdivisionName: LEGAL.subdivisionName, deptName: LEGAL.deptName },
    ];
    const budget = learningBudgetByDivision(records);
    expect(budget.rows[0]).toEqual({ divisionName: 'Other Division', cost: 105500, gapPts: 27 });
    expect(budget.rows[1]).toEqual({ divisionName: 'Support Functions', cost: 0, gapPts: 0 });
    expect(budget.total).toBe(105500);
  });
});
