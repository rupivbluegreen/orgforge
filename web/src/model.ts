import { HayEngine } from '../../src/engines/hay';
import { CostEngine } from '../../src/engines/cost';
import { seedDepartmentPeople, mulberry32, hashStr } from '../../src/engines/person';
import { gapStats } from '../../src/engines/sfia-gap';
import { computeOrgStats, captureBaseline } from '../../src/engines/workforce';
import { assessDepartmentMove, assessPersonMove } from '../../src/engines/governance';
import { draftRationale } from '../../src/engines/rationale';
import { applyRestructuring } from '../../src/engines/restructuring';
import type { RestructuringAction } from '../../src/engines/restructuring';
import type { Person } from '../../src/engines/person';
import type { HayEvaluation, OrgModel } from '../../src/engines/types';
import type { RationaleDraft } from '../../src/engines/rationale';
import type { DepartmentBaseline } from '../../src/engines/workforce';
import embeddedDataset from '../../fixtures/embedded-dataset.json';

export interface UiDepartment {
  department: string;
  hc: number;
  base: number;
  _division: string;
  _subdivision: string;
  people: Person[];
  hay: HayEvaluation;
  ctc: number;
  readiness: number;
  gapShort: number;
  gapReqCnt: number;
  gapPts: number;
  approvedHC: number;
  frozen: boolean;
}

export interface UiSubdivision {
  name: string;
  departments: UiDepartment[];
}

export interface UiDivision {
  name: string;
  subdivisions: UiSubdivision[];
}

export interface UiOrgModel {
  divisions: UiDivision[];
}

type EmbeddedRow = { division: string; subdivision: string; department: string; hc: number; base: number };

// PEOPLE_PER_DEPT from PRD §4.2 / Build 6 CONFIG
const PEOPLE_PER_DEPT = 3;

export function buildInitialModel(now: Date = new Date()): UiOrgModel {
  const dataset = embeddedDataset as EmbeddedRow[];
  const divMap = new Map<string, Map<string, UiDepartment[]>>();
  let pid = 1;

  dataset.forEach((r) => {
    if (!divMap.has(r.division)) divMap.set(r.division, new Map());
    const subMap = divMap.get(r.division)!;
    if (!subMap.has(r.subdivision)) subMap.set(r.subdivision, []);
    const people = seedDepartmentPeople(r.division, r.subdivision, r.department, PEOPLE_PER_DEPT, pid, now);
    pid += PEOPLE_PER_DEPT;
    // Own seed: approved-HC/freeze, apart from people.
    const posRng = mulberry32(hashStr(`${r.department}:position`));
    subMap.get(r.subdivision)!.push({
      department: r.department, hc: r.hc, base: r.base,
      _division: r.division, _subdivision: r.subdivision,
      people, hay: {} as HayEvaluation, ctc: 0, readiness: 100, gapShort: 0, gapReqCnt: 0, gapPts: 0,
      approvedHC: r.hc + Math.floor(posRng() * 4), frozen: posRng() < 0.18,
    });
  });

  const model: UiOrgModel = {
    divisions: [...divMap.entries()].map(([name, subMap]) => ({
      name,
      subdivisions: [...subMap.entries()].map(([sName, departments]) => ({ name: sName, departments })),
    })),
  };
  annotate(model);
  return model;
}

// Recomputes Hay/CTC: division aggregates shift
export function annotate(model: UiOrgModel): void {
  model.divisions.forEach((div) => {
    div.subdivisions.forEach((sub) => {
      sub.departments.forEach((dept) => {
        dept.hay = HayEngine.evaluate(dept, model as unknown as OrgModel);
        dept.ctc = CostEngine.deptCTC(dept, dept.hay.total);
        const stats = gapStats(dept.people, dept._division, dept._subdivision, dept.department);
        dept.readiness = stats.ready;
        dept.gapShort = stats.short;
        dept.gapReqCnt = stats.reqCnt;
        dept.gapPts = stats.gapPts;
      });
    });
  });
}

export function findDept(model: UiOrgModel, deptName: string): { div: UiDivision; sub: UiSubdivision; dept: UiDepartment } | null {
  for (const div of model.divisions) {
    for (const sub of div.subdivisions) {
      const dept = sub.departments.find((d) => d.department === deptName);
      if (dept) return { div, sub, dept };
    }
  }
  return null;
}

export interface MoveResult {
  entity: string;
  from: { division: string; subdivision: string };
  to: { division: string; subdivision: string };
  hayBefore: HayEvaluation;
  hayAfter: HayEvaluation;
  ctcBefore: number;
  ctcAfter: number;
  verdict: ReturnType<typeof assessDepartmentMove>;
  rationale: RationaleDraft;
}

export function moveDepartment(model: UiOrgModel, deptName: string, toDivision: string, toSubdivision: string): MoveResult | null {
  const loc = findDept(model, deptName);
  if (!loc) return null;
  const fromDivision = loc.div.name;
  const fromSubdivision = loc.sub.name;
  const hayBefore = loc.dept.hay;
  const ctcBefore = loc.dept.ctc;

  loc.sub.departments = loc.sub.departments.filter((d) => d.department !== deptName);
  const toDiv = model.divisions.find((d) => d.name === toDivision)!;
  const toSub = toDiv.subdivisions.find((s) => s.name === toSubdivision)!;
  loc.dept._division = toDivision;
  loc.dept._subdivision = toSubdivision;
  toSub.departments.push(loc.dept);

  annotate(model);
  const hayAfter = loc.dept.hay;
  const ctcAfter = loc.dept.ctc;

  const verdict = assessDepartmentMove(
    {
      entityType: 'department', entity: deptName,
      from: { division: fromDivision, subdivision: fromSubdivision },
      to: { division: toDivision, subdivision: toSubdivision },
      hayBefore: { total: hayBefore.total, grade: hayBefore.grade },
      hayAfter: { total: hayAfter.total, grade: hayAfter.grade },
    },
    model as unknown as OrgModel
  );

  const rationale = draftRationale({
    entity: deptName, entityType: 'department', hc: loc.dept.hc, cost: loc.dept.base,
    from: { division: fromDivision, subdivision: fromSubdivision },
    to: { division: toDivision, subdivision: toSubdivision },
    toDivHC: toDiv.subdivisions.reduce((a, s) => a + s.departments.reduce((b, d) => b + d.hc, 0), 0),
    hayBefore: { total: hayBefore.total, grade: hayBefore.grade, kh: { pts: hayBefore.kh.pts }, acc: { pts: hayBefore.acc.pts } },
    hayAfter: { total: hayAfter.total, grade: hayAfter.grade, kh: { pts: hayAfter.kh.pts }, acc: { pts: hayAfter.acc.pts } },
  });

  return {
    entity: deptName,
    from: { division: fromDivision, subdivision: fromSubdivision },
    to: { division: toDivision, subdivision: toSubdivision },
    hayBefore, hayAfter, ctcBefore, ctcAfter, verdict, rationale,
  };
}

export function findPerson(
  model: UiOrgModel,
  personId: string
): { div: UiDivision; sub: UiSubdivision; dept: UiDepartment; person: Person } | null {
  for (const div of model.divisions) {
    for (const sub of div.subdivisions) {
      for (const dept of sub.departments) {
        const person = dept.people.find((p) => p.id === personId);
        if (person) return { div, sub, dept, person };
      }
    }
  }
  return null;
}

export interface PersonMoveResult {
  person: Person;
  fromDepartment: string;
  toDepartment: string;
  toDivision: string;
  hayAfter: HayEvaluation;
  ctcDelta: number;
  verdict: ReturnType<typeof assessPersonMove>;
}

export function movePerson(model: UiOrgModel, personId: string, toDeptName: string): PersonMoveResult | null {
  const from = findPerson(model, personId);
  const to = findDept(model, toDeptName);
  if (!from || !to || from.dept.department === toDeptName) return null;

  const fromCtcBefore = from.dept.ctc;
  const toCtcBefore = to.dept.ctc;

  const pi = from.dept.people.findIndex((p) => p.id === personId);
  const [person] = from.dept.people.splice(pi, 1);
  from.dept.hc = Math.max(0, from.dept.hc - 1);
  from.dept.base = Math.max(0, from.dept.base - person.sal);
  to.dept.people.push(person);
  to.dept.hc += 1;
  to.dept.base += person.sal;

  annotate(model);

  const verdict = assessPersonMove({
    entityType: 'person',
    toDepartmentName: toDeptName,
    toDepartmentPeople: to.dept.people.map((p) => ({ grade: p.grade })),
  });

  const ctcDelta = (from.dept.ctc - fromCtcBefore) + (to.dept.ctc - toCtcBefore);

  return {
    person, fromDepartment: from.dept.department, toDepartment: toDeptName,
    toDivision: to.div.name, hayAfter: to.dept.hay, ctcDelta, verdict,
  };
}

export function cloneModel(model: UiOrgModel): UiOrgModel {
  return {
    divisions: model.divisions.map((d) => ({
      name: d.name,
      subdivisions: d.subdivisions.map((s) => ({
        name: s.name,
        departments: s.departments.map((dept) => ({ ...dept, people: dept.people.map((p) => ({ ...p })) })),
      })),
    })),
  };
}

export function orgTotals(model: UiOrgModel): { hc: number; base: number; ctc: number; divisions: number; departments: number } {
  return CostEngine.totals(model as unknown as OrgModel);
}

export function allDepartments(model: UiOrgModel): UiDepartment[] {
  return model.divisions.flatMap((d) => d.subdivisions.flatMap((s) => s.departments));
}

export function orgStats(model: UiOrgModel): { ready: number; avgHay: number } {
  return computeOrgStats(allDepartments(model).map((d) => ({ gapShort: d.gapShort, gapReqCnt: d.gapReqCnt, hayTotal: d.hay.total })));
}

export function captureDeptBaseline(model: UiOrgModel): Record<string, DepartmentBaseline> {
  return captureBaseline(allDepartments(model).map((d) => ({
    deptName: d.department, ctc: d.ctc, gapPts: d.gapPts, short: d.gapShort,
    hayTotal: d.hay.total, divisionName: d._division,
  })));
}

export interface SheetRow {
  dept: string; div: string; sub: string; hc: number; prem: number;
  hay: number; grade: string; headPay: number; ctc: number; dCtc: number;
  short: number; gapPts: number; dGap: number; reqCnt: number; ready: number;
  moved: boolean;
}

export function sheetRows(model: UiOrgModel, baseline: Record<string, DepartmentBaseline>): SheetRow[] {
  const rows: SheetRow[] = [];
  model.divisions.forEach((div) => {
    div.subdivisions.forEach((sub) => {
      sub.departments.forEach((dept) => {
        const b = baseline[dept.department];
        rows.push({
          dept: dept.department, div: div.name, sub: sub.name, hc: dept.hc,
          prem: CostEngine.premium(div.name), hay: dept.hay.total, grade: dept.hay.grade,
          headPay: CostEngine.headAnnual(dept.hay.total), ctc: dept.ctc,
          dCtc: dept.ctc - (b?.ctc ?? dept.ctc), short: dept.gapShort, gapPts: dept.gapPts,
          dGap: dept.gapPts - (b?.gapPts ?? dept.gapPts), reqCnt: dept.gapReqCnt,
          ready: dept.readiness, moved: b ? b.divisionName !== div.name : false,
        });
      });
    });
  });
  return rows;
}

export interface RestructureResult {
  deptName: string;
  deleted: boolean;
  hcRemoved: number;
}

export function applyRestructure(model: UiOrgModel, deptName: string, action: RestructuringAction): RestructureResult | null {
  const loc = findDept(model, deptName);
  if (!loc) return null;
  if (action === 'delete') {
    const hcRemoved = loc.dept.hc;
    loc.sub.departments = loc.sub.departments.filter((d) => d.department !== deptName);
    annotate(model);
    return { deptName, deleted: true, hcRemoved };
  }
  const result = applyRestructuring(loc.dept, action);
  if (result.type === 'downsize') {
    loc.dept.hc = result.hc;
    loc.dept.base = result.base;
    loc.dept.approvedHC = result.approvedHC;
    loc.dept.people = loc.dept.people.filter((p) => !result.removedPersonIds.includes(p.id));
  }
  annotate(model);
  return { deptName, deleted: false, hcRemoved: action };
}

export interface PersonRecord {
  person: Person;
  div: UiDivision;
  sub: UiSubdivision;
  dept: UiDepartment;
}

export function allPeople(model: UiOrgModel): PersonRecord[] {
  const out: PersonRecord[] = [];
  model.divisions.forEach((div) => {
    div.subdivisions.forEach((sub) => {
      sub.departments.forEach((dept) => {
        dept.people.forEach((person) => out.push({ person, div, sub, dept }));
      });
    });
  });
  return out;
}
