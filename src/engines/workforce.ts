import { GRADE_LEVEL } from './hay-constants';
import { CostEngine } from './cost';
import type { CostTotals } from './cost';

// readiness/avg Hay
export interface OrgStatsInput {
  gapShort: number;
  gapReqCnt: number;
  hayTotal: number;
}

export interface OrgStats {
  ready: number;
  avgHay: number;
}

export function computeOrgStats(depts: OrgStatsInput[]): OrgStats {
  let short = 0;
  let req = 0;
  let hay = 0;
  depts.forEach((d) => {
    short += d.gapShort;
    req += d.gapReqCnt;
    hay += d.hayTotal;
  });
  return {
    ready: req ? Math.round(100 * (1 - short / req)) : 100,
    avgHay: depts.length ? Math.round(hay / depts.length) : 0,
  };
}

// Scenario
export interface ScenarioSnapshot {
  totals: CostTotals;
  ready: number;
  movesCount: number;
  timestamp: string;
}

export function captureScenario(totals: CostTotals, ready: number, movesCount: number, now: Date = new Date()): ScenarioSnapshot {
  return { totals, ready, movesCount, timestamp: now.toISOString() };
}

export interface ScenarioComparison {
  cheaper: 'A' | 'B' | 'equal';
  ctcDifference: number;
  moreReady: 'A' | 'B' | 'equal';
  readinessDifference: number;
}

export function compareScenarios(a: ScenarioSnapshot, b: ScenarioSnapshot): ScenarioComparison {
  return {
    cheaper: a.totals.ctc === b.totals.ctc ? 'equal' : a.totals.ctc < b.totals.ctc ? 'A' : 'B',
    ctcDifference: Math.abs(a.totals.ctc - b.totals.ctc),
    moreReady: a.ready === b.ready ? 'equal' : a.ready > b.ready ? 'A' : 'B',
    readinessDifference: Math.abs(a.ready - b.ready),
  };
}

export interface DepartmentBaseline {
  ctc: number;
  gapPts: number;
  short: number;
  hayTotal: number;
  divisionName: string;
}

export interface DepartmentBaselineInput extends DepartmentBaseline {
  deptName: string;
}

// KPI delta baseline
export function captureBaseline(depts: DepartmentBaselineInput[]): Record<string, DepartmentBaseline> {
  const out: Record<string, DepartmentBaseline> = {};
  depts.forEach((d) => {
    out[d.deptName] = { ctc: d.ctc, gapPts: d.gapPts, short: d.short, hayTotal: d.hayTotal, divisionName: d.divisionName };
  });
  return out;
}

// Span of control
export interface SpanDepartment {
  headHayTotal: number;
  people: { grade: string; sal: number }[];
}

export type SpanStatus = 'REVIEW LAYERS' | 'MONITOR' | 'HEALTHY';

export interface SpanOfControl {
  managers: number;
  ics: number;
  managementCost: number;
  span: number;
  status: SpanStatus;
}

export function computeSpanOfControl(depts: SpanDepartment[]): SpanOfControl {
  let managers = 0;
  let ics = 0;
  let managementCost = 0;
  depts.forEach((d) => {
    managers++;
    managementCost += CostEngine.headAnnual(d.headHayTotal);
    d.people.forEach((p) => {
      if ((GRADE_LEVEL[p.grade] ?? 0) >= 5) {
        managers++;
        managementCost += p.sal;
      } else {
        ics++;
      }
    });
  });
  const span = ics / Math.max(1, managers);
  const status: SpanStatus = span < 0.6 ? 'REVIEW LAYERS' : span < 1 ? 'MONITOR' : 'HEALTHY';
  return { managers, ics, managementCost, span, status };
}

// Position ledger
export interface PositionDepartment {
  deptName: string;
  divisionName: string;
  approvedHC: number;
  hc: number;
  frozen: boolean;
}

export interface PositionLedgerRow {
  deptName: string;
  divisionName: string;
  approvedHC: number;
  actualHC: number;
  vacancies: number;
  frozen: boolean;
  status: string;
}

export interface PositionLedgerResult {
  rows: PositionLedgerRow[];
  totalApproved: number;
  totalActual: number;
  totalVacancies: number;
  totalFrozen: number;
}

export function buildPositionLedger(depts: PositionDepartment[]): PositionLedgerResult {
  let totalApproved = 0;
  let totalActual = 0;
  let totalVacancies = 0;
  let totalFrozen = 0;
  const rows = depts.map((d) => {
    const vacancies = Math.max(0, d.approvedHC - d.hc);
    totalApproved += d.approvedHC;
    totalActual += d.hc;
    totalVacancies += vacancies;
    if (d.frozen) totalFrozen++;
    const status =
      vacancies === 0 ? 'At establishment' : d.frozen ? 'Vacancies frozen — CFO approval to hire' : 'Recruitable — push req via Tab 04';
    return { deptName: d.deptName, divisionName: d.divisionName, approvedHC: d.approvedHC, actualHC: d.hc, vacancies, frozen: d.frozen, status };
  });
  return { rows, totalApproved, totalActual, totalVacancies, totalFrozen };
}
