import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { HayEngine } from '../src/engines/hay';
import { CostEngine } from '../src/engines/cost';
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

describe('CostEngine.deptCTC — STREAMS fix downstream effect', () => {
  it('Legal CTC drops to 11,134,864 (from the legacy 11,161,396) because ACC points dropped', () => {
    const legal = findDept('Legal');
    const hay = HayEngine.evaluate(legal, model);
    const ctc = CostEngine.deptCTC(legal, hay.total);
    expect(ctc).toBe(11134864);

    const legacy = JSON.parse(readFileSync('fixtures/legacy-hay-cost.json', 'utf8')).find((r: any) => r.department === 'Legal');
    expect(legacy.ctc).toBe(11161396);
    expect(ctc).not.toBe(legacy.ctc);
  });

  it('Human Resources CTC is unchanged from the legacy output', () => {
    const hr = findDept('Human Resources');
    const hay = HayEngine.evaluate(hr, model);
    const ctc = CostEngine.deptCTC(hr, hay.total);
    const legacy = JSON.parse(readFileSync('fixtures/legacy-hay-cost.json', 'utf8')).find((r: any) => r.department === 'Human Resources');
    expect(ctc).toBe(legacy.ctc);
  });

  it('premium() falls back to 1.00 for an unknown division', () => {
    expect(CostEngine.premium('Some New Division')).toBe(1.0);
  });
});

describe('CostEngine.totals', () => {
  it('sums hc/base/ctc across all 43 embedded departments, matches the known dataset totals', () => {
    const totals = CostEngine.totals(model);
    expect(totals.hc).toBe(4200);
    expect(totals.base).toBe(689744000);
    expect(totals.divisions).toBe(7);
    expect(totals.departments).toBe(43);

    const allDepts = model.divisions.flatMap((d) => d.subdivisions.flatMap((s) => s.departments));
    const expectedCtc = allDepts.reduce((sum, d) => sum + CostEngine.deptCTC(d, HayEngine.evaluate(d, model).total), 0);
    expect(totals.ctc).toBe(expectedCtc);
  });
});
