import { describe, it, expect } from 'vitest';
import { seedDepartmentPeople } from '../src/engines/person';
import {
  classifyIntent, formatMoveNarrative, formatReportingLine, draftGapLearningPath,
  draftHayReevaluation, findUnits, draftScenario, draftOkrs, draftManagerCoachingScript,
  computeEquitySnapshot, formatEquitySnapshot, findPersonByName, formatFallbackHelp, tabName,
} from '../src/engines/copilot';
import type { UnitRef } from '../src/engines/copilot';
import type { Person } from '../src/engines/person';
import type { DepartmentInput, OrgModel } from '../src/engines/types';

const NOW = new Date('2026-09-22T00:00:00.000Z');
const [mariam] = seedDepartmentPeople('Support Functions', 'Risk & Control Functions', 'Legal', 3, 1, NOW);

describe('classifyIntent', () => {
  it('routes each phrasing to the right intent, in shipped priority order', () => {
    expect(classifyIntent('Why was this move flagged?')).toBe('why-invalid');
    expect(classifyIntent('Who does this person report to?')).toBe('reporting-line');
    expect(classifyIntent('Create a scenario merging IT and Operations, 10%')).toBe('scenario');
    expect(classifyIntent('Draft 3 OKRs for Mariam')).toBe('okrs');
    expect(classifyIntent('How can the manager help improve performance?')).toBe('manager-help');
    expect(classifyIntent('How do I fill the L4 gap?')).toBe('gap-path');
    expect(classifyIntent('What raises this role to the next grade?')).toBe('reeval');
    expect(classifyIntent("What's our pay equity looking like?")).toBe('equity');
    expect(classifyIntent("What's the EOSB policy?")).toBe('policy');
    expect(classifyIntent('What is the weather today?')).toBe('fallback');
  });
});

describe('formatMoveNarrative', () => {
  it('formats a verdict with reasons and the undo note for INVALID', () => {
    const text = formatMoveNarrative({
      verdict: { verdict: 'INVALID', reasons: ['Span-of-control breach.', 'Grading rule breach.'] },
      entity: 'Legal', entityType: 'department', toLabel: 'Front Office & Distribution',
    });
    expect(text).toBe(
      'INVALID — Move: Legal (department) → Front Office & Distribution\n• Span-of-control breach.\n• Grading rule breach.\n↩ Undo is armed — the structure remains editable until you accept.'
    );
  });

  it('omits the undo note for VALID/HUMAN, and has a fallback for no move yet', () => {
    const text = formatMoveNarrative({
      verdict: { verdict: 'HUMAN', reasons: ['Independence review required.'] },
      entity: 'Legal', entityType: 'department', toLabel: 'Front Office & Distribution',
    });
    expect(text).not.toContain('Undo is armed');
    expect(formatMoveNarrative(null)).toContain('No structural move yet this session');
  });
});

describe('formatReportingLine', () => {
  it('traces the chain for a selected department, or gives the generic pattern', () => {
    expect(formatReportingLine({ deptName: 'Legal', subdivisionName: 'Risk & Control Functions', divisionName: 'Support Functions' })).toBe(
      'Reporting line for Legal: staff → Head of Legal → Head of Risk & Control Functions → EVP Support Functions → CEO. Moving the manager re-parents the whole chain instantly — JDs, org chart and Hay context re-sync automatically (watch the Ledger).'
    );
    expect(formatReportingLine(null)).toContain('Reporting lines run staff → Department Head');
  });
});

describe('draftGapLearningPath', () => {
  it('matches Mariam\'s known SFIA gaps exactly', () => {
    const text = draftGapLearningPath(mariam, 'Support Functions', 'Risk & Control Functions', 'Legal');
    expect(text).toBe(
      'SFIA gaps — Mariam Khalifa (Team Manager, M3):\n' +
      '• AML / sanctions compliance: L5 → L6. Path: shadow a L6+ practitioner on live Legal work (70%) · monthly coaching review (20%) · targeted AML / sanctions compliance certification/e-learning (10%).\n' +
      '• Personal data protection: L4 → L5. Path: shadow a L5+ practitioner on live Legal work (70%) · monthly coaching review (20%) · targeted Personal data protection certification/e-learning (10%).\n' +
      'Anchor all three to plan MGR-4-5; re-assess in one quarter.'
    );
  });

  it('gives the fully-met message when there are no gaps, and a fallback for no person', () => {
    const fullyQualified: Person = {
      id: 'EMP-X', name: 'Full Match', job: 'Head of Legal', grade: 'M2',
      skills: { RSKM: 5, GOVN: 5, AMLC: 5, DAAN: 4, AUDT: 4, PEDP: 4 },
      behaviours: {}, sal: 400000, allow: 0, startDate: '2020-01-01', nationality: 'Expat', perf: 3,
    };
    const text = draftGapLearningPath(fullyQualified, 'Support Functions', 'Risk & Control Functions', 'Legal');
    expect(text).toBe('Full Match fully meets the SFIA profile for Head of Legal (M2) — surplus 0 pts. Recommend a stretch assignment from plan MGR-3-4.');
    expect(draftGapLearningPath(null, 'x', 'y', 'z')).toContain('Select a person');
  });
});

describe('draftHayReevaluation', () => {
  const legalDept: DepartmentInput = { department: 'Legal', hc: 41, base: 7562000, _division: 'Support Functions', _subdivision: 'Risk & Control Functions' };
  const model: OrgModel = {
    divisions: [{
      name: 'Support Functions',
      subdivisions: [
        { name: 'Business Support', departments: [
          { department: 'Human Resources', hc: 47, base: 10034000, _division: 'Support Functions', _subdivision: 'Business Support' },
          { department: 'Finance & Accounting', hc: 45, base: 7639000, _division: 'Support Functions', _subdivision: 'Business Support' },
          { department: 'Corporate Communications', hc: 53, base: 10758000, _division: 'Support Functions', _subdivision: 'Business Support' },
          { department: 'Procurement & Administration', hc: 43, base: 8312000, _division: 'Support Functions', _subdivision: 'Business Support' },
          { department: 'Strategy & Transformation', hc: 46, base: 7119000, _division: 'Support Functions', _subdivision: 'Business Support' },
        ] },
        { name: 'Risk & Control Functions', departments: [
          legalDept,
          { department: 'Compliance & AML', hc: 54, base: 9709000, _division: 'Support Functions', _subdivision: 'Risk & Control Functions' },
          { department: 'Internal Audit', hc: 57, base: 12180000, _division: 'Support Functions', _subdivision: 'Risk & Control Functions' },
        ] },
      ],
    }],
  };

  it('matches the independently-verified lever simulation exactly', () => {
    const text = draftHayReevaluation(legalDept, model);
    expect(text).toContain('RE-EVALUATION MODEL — Head of Legal');
    expect(text).toContain('Current: 810 pts = M2 (KH 460 · PS 175 · ACC 175). Next grade M1 at 920 pts — gap 110 pts.');
    expect(text).toContain('• Scale the unit to ≥60 HC (Know-How E→E+) → ~903 pts (+93)');
    expect(text).toContain('• Grow controlled cost/portfolio to ≥ AED 12M (Accountability magnitude 2) → ~835 pts (+25)');
    expect(text).not.toContain('crosses the M1 line');
  });

  it('gives a fallback for no department selected', () => {
    expect(draftHayReevaluation(null, model)).toContain('Pick a department');
  });

  // E1 unreachable: evaluate() caps < 1850pt
});

describe('findUnits / draftScenario', () => {
  const units: UnitRef[] = [
    { name: 'Legal', type: 'department', hc: 41, base: 7562000 },
    { name: 'Finance & Accounting', type: 'department', hc: 45, base: 7639000 },
  ];

  it('findUnits matches by first word, ignores short names, caps at 4', () => {
    expect(findUnits('merging Legal and Finance departments', units).map((u) => u.name)).toEqual(['Legal', 'Finance & Accounting']);
    expect(findUnits('nothing relevant here', units)).toEqual([]);
  });

  it('drafts a merger scenario with exact cost/headcount math', () => {
    const text = draftScenario('Create a merger scenario for Legal and Finance with 10% reduction', units, 1000);
    expect(text).toContain('SCENARIO DRAFT — MERGER');
    expect(text).toContain('Units in scope: Legal (department) + Finance & Accounting (department) · combined 86 HC · base AED 15.2M.');
    expect(text).toContain('Headcount reduction 10% ≈ 9 roles → annual base saving ~AED 1.5M');
    expect(text).toContain('One-off separation cost estimate ≈ AED 532K');
    expect(text).toContain('Merger note: expect 1 consolidated leadership layer');
  });

  it('falls back to org-wide headcount when no units matched but a % is given', () => {
    const text = draftScenario('reduce headcount by 15%', [], 1000);
    expect(text).toContain('Units in scope: entire bank · combined 1,000 HC.');
    expect(text).toContain('Headcount reduction 15% ≈ 150 roles');
    expect(text).not.toContain('Merger note');
  });

  it('returns null when there is no merge keyword, no %, and no matched units', () => {
    expect(draftScenario('what is the weather', units, 1000)).toBeNull();
  });
});

describe('draftOkrs / draftManagerCoachingScript', () => {
  it('OKRs thread the top-2 SFIA gaps and the next-rating plan id', () => {
    const text = draftOkrs(mariam, 'Legal', 'Support Functions', 'Risk & Control Functions');
    expect(text).toContain('OKRs — Mariam Khalifa (Team Manager, rating 4) · next cycle');
    expect(text).toContain('O1. Close the AML / sanctions compliance capability gap');
    expect(text).toContain('Deliver 2 Legal deliverables using AML / sanctions compliance accepted first-time.');
    expect(text).toContain('Lift performance from 4 toward 5 on plan MGR-4-5.');
    expect(text).toContain('Personal data protection evidenced in 360 feedback');
  });

  it('manager coaching script pulls the plan\'s trans/time/otj/coach fields', () => {
    const text = draftManagerCoachingScript(mariam, 'Legal');
    expect(text).toBe(
      'How the manager lifts Mariam Khalifa (rating 4):\n' +
      '• Contract the 4 → 5 plan formally — dates, evidence, review rhythm (12–18 months, semi-annual sponsor review.).\n' +
      '• Delegate one visible stretch piece from Legal tied to the 70% actions: "Own a transformation initiative from the Workforce & Scenarios module".\n' +
      '• Run monthly 30-min evidence reviews — score against the exit criteria, not impressions.\n' +
      '• Broker exposure: ExCo-level sponsor.\n' +
      '• Remove blockers publicly, correct privately; log wins to the calibration file so the next rating defends itself.'
    );
  });
});

describe('computeEquitySnapshot / formatEquitySnapshot', () => {
  it('matches a hand-computed 3-person snapshot exactly', () => {
    const people: Person[] = [
      { id: 'p1', name: 'Under', job: 'x', grade: 'M2', skills: {}, behaviours: {}, sal: 350000, allow: 0, startDate: '2020-01-01', nationality: 'Expat', perf: 3 },
      { id: 'p2', name: 'Over', job: 'x', grade: 'M2', skills: {}, behaviours: {}, sal: 460000, allow: 0, startDate: '2020-01-01', nationality: 'Expat', perf: 3 },
      { id: 'p3', name: 'Mid', job: 'x', grade: 'M2', skills: {}, behaviours: {}, sal: 400000, allow: 0, startDate: '2020-01-01', nationality: 'Expat', perf: 3 },
    ];
    const snap = computeEquitySnapshot(people);
    expect(snap).toEqual({ avgCompaRatio: '0.99', belowBand: 1, aboveBand: 1, totalEmployees: 3 });
    expect(formatEquitySnapshot(snap)).toBe(
      'Pay equity snapshot: avg compa-ratio 0.99 across 3 employees · 1 below 0.90 (under-band risk) · 1 above 1.10 (over-band). Priority: rating-4/5 employees under 0.90 — cross-check the Flight-Risk overlay and fund from the Merit Matrix.'
    );
  });
});

describe('findPersonByName / formatFallbackHelp / tabName', () => {
  it('finds a person by a >3-char name fragment in free text', () => {
    expect(findPersonByName("ask about mariam's progress", [mariam])).toBe(mariam);
    expect(findPersonByName('tell me about someone else', [mariam])).toBeNull();
  });

  it('formats the fallback help line with and without a selection', () => {
    expect(formatFallbackHelp('org', null)).toContain("I'm watching the Org Design tab. Ask me:");
    expect(formatFallbackHelp('perf', 'Mariam Khalifa')).toContain("I'm watching the Performance tab with Mariam Khalifa selected.");
  });

  it('falls back to the raw tab key for an unknown tab', () => {
    expect(tabName('unknown-tab')).toBe('unknown-tab');
  });
});
