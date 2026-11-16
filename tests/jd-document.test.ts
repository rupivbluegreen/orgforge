import { describe, it, expect } from 'vitest';
import { buildJobDescription, jdKey, exportJdData } from '../src/engines/jd-document';
import type { JdBuildInput } from '../src/engines/jd-document';

const NOW = new Date('2026-09-22T14:30:00.000Z');

describe('jdKey', () => {
  it('head roles key by department, person roles key by personId', () => {
    expect(jdKey({ type: 'head', dept: 'Legal' })).toBe('H::Legal');
    expect(jdKey({ type: 'person', dept: 'Legal', personId: 'EMP-10001' })).toBe('P::EMP-10001');
  });
});

describe('buildJobDescription — Head of Legal (real dept, hand-verified)', () => {
  const input: JdBuildInput = {
    role: { type: 'head', label: 'Head of Legal', dept: 'Legal', div: 'Support Functions', sub: 'Risk & Control Functions' },
    isHead: true, deptHc: 41, deptBase: 7562000,
    hay: {
      kh: { pts: 460, note: 'kh note' }, ps: { pts: 175, note: 'ps note' },
      acc: { pts: 175, note: 'acc note', impact: 'R' },
      total: 810, grade: 'M2',
    },
    grade: 'M2', level: 5,
    techList: [
      { code: 'RSKM', name: 'Risk management', cat: 'Governance, risk and compliance', lvl: 5 },
      { code: 'GOVN', name: 'Governance', cat: 'Governance, risk and compliance', lvl: 5 },
      { code: 'AMLC', name: 'AML / sanctions compliance', cat: 'Banking extension', lvl: 5 },
      { code: 'DAAN', name: 'Data analytics', cat: 'Data and analytics', lvl: 4 },
    ],
    behList: [{ code: 'DECM', name: 'Decision-making', lvl: 6 }],
    revision: 1, generatedBy: 'Mock AI (rules engine)', now: NOW,
  };
  const jd = buildJobDescription(input);

  it('doc_no is the deterministic FNV hash of the jdKey', () => {
    expect(jd.key).toBe('H::Legal');
    expect(jd.doc_no).toBe('JD-6796');
    expect(jd.revision_no).toBe('R1');
    expect(jd.date).toBe('2026-09-22');
  });

  it('reports_to, direct/total reports match the Head-of formula', () => {
    expect(jd.reports_to).toBe('Head of Risk & Control Functions — Support Functions');
    expect(jd.direct_reports).toBe('2'); // round(41/18)=2, clamped [2,9]
    expect(jd.total_reports).toBe('41');
  });

  it('job_skills lists top-4 SFIA skills plus the Oracle Fusion boilerplate', () => {
    expect(jd.job_skills).toBe(
      'Risk management, Governance, AML / sanctions compliance, Data analytics, and working fluency in Oracle Fusion HCM / core banking platforms relevant to the unit.'
    );
  });

  it('structural_context includes HC and cost for head roles', () => {
    expect(jd.structural_context).toBe('Support Functions → Risk & Control Functions → Legal · 41 HC · AED 7.6M annual base');
  });

  it('comms and qualification/experience come from the level/stream tables', () => {
    expect(jd.internal_comms).toContain('Internal Audit, Legal, Finance');
    expect(jd.external_comms).toContain('Central Bank of the UAE');
    expect(jd.min_qualifications).toContain("Bachelor's degree required");
    expect(jd.min_experience).toBe('8–12 years of experience including team leadership and cross-functional delivery.');
  });

  it('job_objective and accountabilities are threaded through from draftJdNarrative', () => {
    expect(jd.job_objective).toContain('Lead the Legal unit (41 FTE)');
    expect(jd.accountabilities).toHaveLength(8);
  });
});

describe('exportJdData — Appendix B template tag payload', () => {
  const input: JdBuildInput = {
    role: { type: 'head', label: 'Head of Legal', dept: 'Legal', div: 'Support Functions', sub: 'Risk & Control Functions' },
    isHead: true, deptHc: 41, deptBase: 7562000,
    hay: { kh: { pts: 460, note: 'kh note' }, ps: { pts: 175, note: 'ps note' }, acc: { pts: 175, note: 'acc note', impact: 'R' }, total: 810, grade: 'M2' },
    grade: 'M2', level: 5,
    techList: [{ code: 'RSKM', name: 'Risk management', cat: 'Governance, risk and compliance', lvl: 5 }],
    behList: [{ code: 'DECM', name: 'Decision-making', lvl: 6 }],
    revision: 2, generatedBy: 'Mock AI (rules engine)', now: NOW,
  };
  const jd = buildJobDescription(input);
  const data = exportJdData(jd);

  it('numbers accountabilities for key_accountabilities and ai_responsibilities tags', () => {
    expect(data.key_accountabilities.split('\n')[0]).toMatch(/^1\. /);
    expect(data.ai_responsibilities).toBe(data.key_accountabilities);
  });

  it('formats Hay factor tags with points and note', () => {
    expect(data.hay_know_how).toBe('460 pts — kh note');
    expect(data.hay_score).toBe('810');
    expect(data.hay_total).toBe('810');
    expect(data.hay_grade).toBe('M2');
  });

  it('formats technical and behavioural competency tags', () => {
    expect(data.technical_competencies).toBe('Risk management (RSKM) — Level 5');
    expect(data.sfia_skills).toBe('RSKM L5');
    expect(data.behavioral_competencies).toBe('Decision-making — Level 6');
  });
});
