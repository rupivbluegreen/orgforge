import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { HayEngine } from '../src/engines/hay';
import type { OrgModel, DepartmentInput } from '../src/engines/types';

const dataset = JSON.parse(readFileSync('fixtures/embedded-dataset.json', 'utf8')) as Array<{
  division: string; subdivision: string; department: string; hc: number; base: number;
}>;

function buildModel(): OrgModel {
  const divisions = new Map<string, Map<string, DepartmentInput[]>>();
  for (const r of dataset) {
    if (!divisions.has(r.division)) divisions.set(r.division, new Map());
    const subs = divisions.get(r.division)!;
    if (!subs.has(r.subdivision)) subs.set(r.subdivision, []);
    subs.get(r.subdivision)!.push({
      department: r.department, hc: r.hc, base: r.base,
      _division: r.division, _subdivision: r.subdivision,
    });
  }
  return {
    divisions: [...divisions].map(([name, subs]) => ({
      name,
      subdivisions: [...subs].map(([sName, departments]) => ({ name: sName, departments })),
    })),
  };
}

const model = buildModel();
const findDept = (name: string): DepartmentInput =>
  model.divisions.flatMap((d) => d.subdivisions.flatMap((s) => s.departments)).find((d) => d.department === name)!;

describe('HayEngine.evaluate — STREAMS fix (PRD §5.2)', () => {
  it('Legal (Risk & Control Functions): ACC drops 230→175, total 865→810, grade stays M2', () => {
    const hay = HayEngine.evaluate(findDept('Legal'), model);
    expect(hay.kh.pts).toBe(460);
    expect(hay.ps.pts).toBe(175);
    expect(hay.acc.pts).toBe(175);
    expect(hay.total).toBe(810);
    expect(hay.grade).toBe('M2');
  });

  it('Human Resources (Business Support, impact was already C pre-fix) is byte-identical to the legacy prototype output', () => {
    const legacy = JSON.parse(readFileSync('fixtures/legacy-hay-cost.json', 'utf8'));
    const legacyHR = legacy.find((r: any) => r.department === 'Human Resources');
    const hay = HayEngine.evaluate(findDept('Human Resources'), model);
    expect(hay.total).toBe(legacyHR.hay.total);
    expect(hay.grade).toBe(legacyHR.hay.grade);
    expect(hay.kh.pts).toBe(legacyHR.hay.kh);
    expect(hay.ps.pts).toBe(legacyHR.hay.ps);
    expect(hay.acc.pts).toBe(legacyHR.hay.acc);
  });

  it('Branch Network (Front Office & Distribution, impact P unaffected by the fix) matches legacy exactly', () => {
    const legacy = JSON.parse(readFileSync('fixtures/legacy-hay-cost.json', 'utf8'));
    const legacyRow = legacy.find((r: any) => r.department === 'Branch Network');
    const hay = HayEngine.evaluate(findDept('Branch Network'), model);
    expect(hay.total).toBe(legacyRow.hay.total);
    expect(hay.grade).toBe(legacyRow.hay.grade);
  });
});
