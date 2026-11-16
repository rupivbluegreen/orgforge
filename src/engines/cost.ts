import type { DepartmentInput, OrgModel } from './types';
import { HayEngine } from './hay';

export const CTC_MULTIPLE = 1.34;

export const DIV_PREMIUM: Record<string, number> = {
  'Support Functions': 1.0,
  'Retail Banking Group': 1.05,
  'Corporate & Institutional Banking': 1.1,
  'Treasury & Global Markets': 1.15,
  'Risk Management Group': 1.08,
  'Operations & Technology': 1.12,
  'Digital Banking & Innovation': 1.14,
};

export interface CostTotals {
  hc: number;
  base: number;
  ctc: number;
  divisions: number;
  departments: number;
}

export const CostEngine = {
  premium(divName: string): number {
    return DIV_PREMIUM[divName] ?? 1.0;
  },
  headAnnual(hayTotal: number): number {
    return Math.round((38000 + (hayTotal || 0) * 30) * 12);
  },
  // hayTotal: HayEngine.evaluate() output
  deptCTC(dept: DepartmentInput, hayTotal: number): number {
    const prem = this.premium(dept._division);
    const staff = dept.base * prem;
    const head = this.headAnnual(hayTotal);
    return Math.round((staff + head) * CTC_MULTIPLE);
  },
  totals(model: OrgModel): CostTotals {
    let hc = 0;
    let base = 0;
    let ctc = 0;
    let departments = 0;
    model.divisions.forEach((d) => {
      d.subdivisions.forEach((s) => {
        s.departments.forEach((dept) => {
          hc += dept.hc;
          base += dept.base;
          ctc += this.deptCTC(dept, HayEngine.evaluate(dept, model).total);
          departments++;
        });
      });
    });
    return { hc, base, ctc, divisions: model.divisions.length, departments };
  },
};
