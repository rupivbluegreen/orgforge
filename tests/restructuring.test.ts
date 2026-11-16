import { describe, it, expect } from 'vitest';
import { modelRestructuring, selectVictims, applyRestructuring } from '../src/engines/restructuring';
import type { RedeploymentCandidate, DepartmentCapacity } from '../src/engines/restructuring';
import type { Person } from '../src/engines/person';

const NOW = new Date('2026-09-22T00:00:00.000Z');

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: 'EMP-1', name: 'Test Person', grade: 'M2', job: 'Head of Legal',
    skills: { RSKM: 5, GOVN: 5, AMLC: 5, DAAN: 4, AUDT: 4, PEDP: 4 },
    behaviours: {}, sal: 480000, allow: 168000, startDate: '2020-01-01',
    nationality: 'Expat', perf: 3,
    ...overrides,
  };
}

const complianceAndAml: RedeploymentCandidate = {
  deptName: 'Compliance & AML', divisionName: 'Support Functions',
  subdivisionName: 'Risk & Control Functions', hc: 50, approvedHC: 54, frozen: false,
};
const financeFrozen: RedeploymentCandidate = {
  deptName: 'Finance & Accounting', divisionName: 'Support Functions',
  subdivisionName: 'Business Support', hc: 45, approvedHC: 47, frozen: true,
};
const financeFull: RedeploymentCandidate = {
  deptName: 'Full Capacity Dept', divisionName: 'Support Functions',
  subdivisionName: 'Business Support', hc: 10, approvedHC: 10, frozen: false,
};
const legalItself: RedeploymentCandidate = {
  deptName: 'Legal', divisionName: 'Support Functions',
  subdivisionName: 'Risk & Control Functions', hc: 41, approvedHC: 45, frozen: false,
};

describe('selectVictims', () => {
  const people = [person({ id: 'a' }), person({ id: 'b' }), person({ id: 'c' })];

  it('delete selects everyone', () => {
    expect(selectVictims(people, 'delete').map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('downsize N selects the first N', () => {
    expect(selectVictims(people, 2).map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('modelRestructuring', () => {
  it('finds the cheapest eligible redeployment and recommends REDEPLOY when cheaper than redundancy', () => {
    const p = person();
    const model = modelRestructuring(
      'Legal', 'delete',
      [complianceAndAml, financeFrozen, financeFull, legalItself],
      [p], NOW
    );

    expect(model.rows).toHaveLength(1);
    const row = model.rows[0];
    expect(row.noticePay).toBe(40000);
    expect(row.eosb).toBe(125380);
    expect(row.redundancyCost).toBe(165380);
    // Compliance & AML: 1 AMLC gap pt x 4500 (Banking extension) = 4500
    expect(row.bestRedeployment).toEqual({ deptName: 'Compliance & AML', cost: 4500, gapPts: 1 });
    expect(row.recommendation).toBe('REDEPLOY');

    expect(model.totalRedundancyCost).toBe(165380);
    expect(model.totalRedeploymentCost).toBe(4500);
    expect(model.recommendedSavings).toBe(160880);
  });

  it('excludes the source dept, frozen depts, and depts with no open capacity', () => {
    const p = person();
    // only ineligible candidates offered -> no redeployment found
    const model = modelRestructuring('Legal', 'delete', [financeFrozen, financeFull, legalItself], [p], NOW);
    expect(model.rows[0].bestRedeployment).toBeNull();
    expect(model.rows[0].recommendation).toBe('REDUNDANCY');
    // with no candidate, redeployment total falls back to redundancy cost
    expect(model.totalRedeploymentCost).toBe(model.totalRedundancyCost);
    expect(model.recommendedSavings).toBe(0);
  });

  it('downsize N only models the first N people', () => {
    const people = [person({ id: 'a' }), person({ id: 'b' }), person({ id: 'c' })];
    const model = modelRestructuring('Legal', 2, [complianceAndAml], people, NOW);
    expect(model.rows.map((r) => r.personId)).toEqual(['a', 'b']);
  });
});

describe('applyRestructuring', () => {
  it('delete signals full department removal, no field math needed', () => {
    expect(applyRestructuring({ hc: 41, base: 7562000, approvedHC: 45, people: [] }, 'delete'))
      .toEqual({ type: 'delete' });
  });

  it('downsize N reduces hc/base/approvedHC and reports the removed person ids', () => {
    const dept: DepartmentCapacity = {
      hc: 41, base: 7562000, approvedHC: 45,
      people: [person({ id: 'a', sal: 200000 }), person({ id: 'b', sal: 220000 }), person({ id: 'c', sal: 300000 })],
    };
    const result = applyRestructuring(dept, 2);
    expect(result).toEqual({
      type: 'downsize', hc: 39, base: 7562000 - 200000 - 220000, approvedHC: 43,
      removedPersonIds: ['a', 'b'],
    });
  });

  it('clamps hc at 0 and approvedHC at the new (clamped) hc when downsizing more than headcount', () => {
    const dept: DepartmentCapacity = {
      hc: 2, base: 500000, approvedHC: 3,
      people: [person({ id: 'a', sal: 200000 }), person({ id: 'b', sal: 300000 })],
    };
    const result = applyRestructuring(dept, 5); // more than hc
    expect(result).toMatchObject({ type: 'downsize', hc: 0, approvedHC: 0 });
  });
});
