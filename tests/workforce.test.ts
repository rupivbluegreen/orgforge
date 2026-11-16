import { describe, it, expect } from 'vitest';
import {
  computeOrgStats, captureScenario, compareScenarios, captureBaseline,
  computeSpanOfControl, buildPositionLedger,
} from '../src/engines/workforce';
import type { ScenarioSnapshot } from '../src/engines/workforce';
import type { CostTotals } from '../src/engines/cost';

describe('computeOrgStats (PRD §5.10 org readiness/avg Hay)', () => {
  it('aggregates short/reqCnt across departments into a readiness %', () => {
    const stats = computeOrgStats([
      { gapShort: 2, gapReqCnt: 6, hayTotal: 810 },
      { gapShort: 1, gapReqCnt: 4, hayTotal: 500 },
    ]);
    expect(stats.ready).toBe(70); // round(100*(1-3/10))
    expect(stats.avgHay).toBe(655); // round(1310/2)
  });

  it('is 100% ready with zero required skills, 0 avgHay with no departments', () => {
    expect(computeOrgStats([])).toEqual({ ready: 100, avgHay: 0 });
  });
});

describe('captureScenario / compareScenarios (PRD §5.10 FR-WFP-01)', () => {
  const totalsA: CostTotals = { hc: 100, base: 3000000, ctc: 5000000, divisions: 1, departments: 5 };
  const totalsB: CostTotals = { hc: 95, base: 2900000, ctc: 4800000, divisions: 1, departments: 5 };

  it('captures a timestamped snapshot', () => {
    const snap = captureScenario(totalsA, 80, 3, new Date('2026-09-23T00:00:00.000Z'));
    expect(snap).toEqual({ totals: totalsA, ready: 80, movesCount: 3, timestamp: '2026-09-23T00:00:00.000Z' });
  });

  it('identifies the cheaper and more-ready scenario with exact deltas', () => {
    const a: ScenarioSnapshot = { totals: totalsA, ready: 80, movesCount: 3, timestamp: 't' };
    const b: ScenarioSnapshot = { totals: totalsB, ready: 75, movesCount: 2, timestamp: 't' };
    expect(compareScenarios(a, b)).toEqual({ cheaper: 'B', ctcDifference: 200000, moreReady: 'A', readinessDifference: 5 });
  });

  it('reports equal when CTC and readiness match exactly', () => {
    const a: ScenarioSnapshot = { totals: totalsA, ready: 80, movesCount: 1, timestamp: 't' };
    const b: ScenarioSnapshot = { totals: totalsA, ready: 80, movesCount: 9, timestamp: 't' };
    expect(compareScenarios(a, b)).toEqual({ cheaper: 'equal', ctcDifference: 0, moreReady: 'equal', readinessDifference: 0 });
  });
});

describe('captureBaseline (PRD §5.10 FR-WFP-02 commit)', () => {
  it('keys per-department snapshots by department name', () => {
    const baseline = captureBaseline([
      { deptName: 'Legal', ctc: 11134864, gapPts: 8, short: 2, hayTotal: 810, divisionName: 'Support Functions' },
    ]);
    expect(baseline.Legal).toEqual({ ctc: 11134864, gapPts: 8, short: 2, hayTotal: 810, divisionName: 'Support Functions' });
  });
});

describe('computeSpanOfControl (PRD §5.10 FR-WFP-03)', () => {
  it('matches a hand-computed 2-department scenario (MONITOR band)', () => {
    const result = computeSpanOfControl([
      {
        headHayTotal: 810, // headAnnual = 747,600
        people: [
          { grade: 'M1', sal: 400000 }, { grade: 'M2', sal: 450000 },
          { grade: 'C2', sal: 100000 }, { grade: 'C3', sal: 90000 }, { grade: 'P3', sal: 150000 },
        ],
      },
      {
        headHayTotal: 500, // headAnnual = 636,000
        people: [{ grade: 'M3', sal: 380000 }, { grade: 'C1', sal: 80000 }],
      },
    ]);
    expect(result.managers).toBe(5); // 2 dept heads + 3 manager-grade people (M1,M2,M3)
    expect(result.ics).toBe(4); // C2,C3,P3,C1
    expect(result.managementCost).toBe(747600 + 636000 + 400000 + 450000 + 380000);
    expect(result.span).toBeCloseTo(0.8, 10);
    expect(result.status).toBe('MONITOR');
  });

  it('flags REVIEW LAYERS below 0.6 and HEALTHY at or above 1.0', () => {
    const heavy = computeSpanOfControl(
      Array.from({ length: 5 }, () => ({ headHayTotal: 0, people: [] }))
    ); // 5 managers (dept heads only), 0 ICs -> span 0
    expect(heavy.status).toBe('REVIEW LAYERS');

    const lean = computeSpanOfControl([
      { headHayTotal: 0, people: [{ grade: 'C1', sal: 1 }, { grade: 'C1', sal: 1 }, { grade: 'C1', sal: 1 }] },
    ]); // 1 manager (dept head), 3 ICs -> span 3
    expect(lean.status).toBe('HEALTHY');
  });
});

describe('buildPositionLedger (PRD §5.10 FR-WFP-05)', () => {
  it('computes vacancies/status per row and org-wide totals', () => {
    const ledger = buildPositionLedger([
      { deptName: 'Legal', divisionName: 'Support Functions', approvedHC: 45, hc: 41, frozen: false },
      { deptName: 'HR', divisionName: 'Support Functions', approvedHC: 50, hc: 50, frozen: false },
      { deptName: 'Ops', divisionName: 'Operations', approvedHC: 30, hc: 25, frozen: true },
    ]);

    expect(ledger.rows[0]).toEqual({
      deptName: 'Legal', divisionName: 'Support Functions', approvedHC: 45, actualHC: 41,
      vacancies: 4, frozen: false, status: 'Recruitable — push req via Tab 04',
    });
    expect(ledger.rows[1].status).toBe('At establishment');
    expect(ledger.rows[2].status).toBe('Vacancies frozen — CFO approval to hire');

    expect(ledger.totalApproved).toBe(125);
    expect(ledger.totalActual).toBe(116);
    expect(ledger.totalVacancies).toBe(9);
    expect(ledger.totalFrozen).toBe(1);
  });
});
