import { describe, it, expect } from 'vitest';
import { draftJdNarrative } from '../src/engines/jd-narrative';
import type { JdNarrativeInput } from '../src/engines/jd-narrative';

describe('draftJdNarrative — Head of Legal (real dept)', () => {
  const input: JdNarrativeInput = {
    role: { label: 'Head of Legal', dept: 'Legal', div: 'Support Functions', sub: 'Risk & Control Functions' },
    isHead: true,
    deptHc: 41,
    deptBase: 7562000,
    hayTotal: 810,
    grade: 'M2',
    level: 5,
    accImpact: 'R',
    techList: [
      { code: 'RSKM', name: 'Risk management', lvl: 5 },
      { code: 'GOVN', name: 'Governance', lvl: 5 },
      { code: 'AMLC', name: 'AML / sanctions compliance', lvl: 5 },
      { code: 'DAAN', name: 'Data analytics', lvl: 4 },
      { code: 'AUDT', name: 'Audit', lvl: 4 },
      { code: 'PEDP', name: 'Personal data protection', lvl: 4 },
    ],
  };
  const out = draftJdNarrative(input);

  it('objective states scope, cost, division goal, remote impact and Hay evaluation', () => {
    expect(out.objective).toBe(
      "Lead the Legal unit (41 FTE) within the Risk & Control Functions stream of Support Functions, holding end-to-end accountability for its operating plan, people, controls and cost base (AED 7.6M annual base), so that the unit delivers measurably against the division's agenda of enterprise enablement, governance and shared-service excellence. The role carries remote impact on end results and is evaluated at 810 Hay points (M2)."
    );
  });

  it('accountabilities: 2 head-fixed + top-4 SFIA skills + Risk-control line + Oracle line = 8, no prime-accountability line', () => {
    expect(out.accountabilities).toEqual([
      "Own the Legal annual operating plan and budget; deliver committed volume, quality, cost and control outcomes and report performance to Risk & Control Functions leadership.",
      "Organise, resource and develop a team of 41 FTE — workforce plans, succession depth, Emiratization commitments and capability uplift against the unit's SFIA profile.",
      "Lead and be accountable for risk management (SFIA RSKM, level 5) for the unit's processes, products and stakeholders.",
      "Lead and be accountable for governance (SFIA GOVN, level 5) for the unit's processes, products and stakeholders.",
      "Lead and be accountable for aml / sanctions compliance (SFIA AMLC, level 5) for the unit's processes, products and stakeholders.",
      "Manage, analyse and improve data analytics (SFIA DAAN, level 4) for the unit's processes, products and stakeholders.",
      "Maintain an effective control environment: policies, RCSAs, regulatory obligations and audit-issue closure, escalating breaches without delay.",
      "Keep position, transaction and employee data current in Oracle Fusion (the system of record); adopt approved AI-assisted workflows and contribute improvement ideas through the continuous-improvement channel.",
    ]);
  });
});

describe('draftJdNarrative — branch coverage (non-head, non-control stream, prime impact)', () => {
  it('non-head uses the incumbent-verb objective form and takes top-5 skills (not 4)', () => {
    const input: JdNarrativeInput = {
      role: { label: 'Relationship Manager', dept: 'Branch Network', div: 'Retail Banking Group', sub: 'Front Office & Distribution' },
      isHead: false, deptHc: 213, deptBase: 31647000, hayTotal: 0, grade: 'P2', level: 4, accImpact: 'P',
      techList: [
        { code: 'SALE', name: 'Selling', lvl: 4 },
        { code: 'CEXP', name: 'Customer experience management', lvl: 4 },
        { code: 'RLMT', name: 'Stakeholder relationship management', lvl: 4 },
        { code: 'PDSV', name: 'Financial product advisory', lvl: 3 },
        { code: 'DAAN', name: 'Data analytics', lvl: 2 },
        { code: 'AMLC', name: 'AML / sanctions compliance', lvl: 2 },
      ],
    };
    const out = draftJdNarrative(input);
    expect(out.objective).toContain('Manage, analyse and improve the relationship manager agenda within Branch Network');
    expect(out.objective).toContain('SFIA level-4 proficiency in selling');
    // non-head: no 2 fixed head lines, takes top 5 skills (not 4)
    expect(out.accountabilities).toHaveLength(5 + 1 + 1 + 1); // 5 skills + control line + oracle line + prime-impact line
    expect(out.accountabilities[0]).toContain('Manage, analyse and improve selling (SFIA SALE, level 4)');
    expect(out.accountabilities.some((a) => a.includes('Operate within the bank\'s control framework'))).toBe(true);
    expect(out.accountabilities.some((a) => a.includes('Carry prime accountability'))).toBe(true);
  });
});
