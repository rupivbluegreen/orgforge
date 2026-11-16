import { describe, it, expect } from 'vitest';
import { seedDepartmentPeople } from '../src/engines/person';
import { buildPersonContext } from '../src/engines/native-gen-context';
import {
  draftPerfNarrative, draftIdp, draftInterviewKit, draftEvalNotes, inferSkills,
  draftTalentTalkingPoints, draftScenarioNarrative, analyzeSentiment, draftLetter,
  answerPolicyQuestion, draftCareerAdvice,
} from '../src/engines/native-gen';

const NOW = new Date('2026-09-22T00:00:00.000Z');
const [mariam] = seedDepartmentPeople('Support Functions', 'Risk & Control Functions', 'Legal', 3, 1, NOW);
const mariamCtx = buildPersonContext(mariam, 'Support Functions', 'Risk & Control Functions', 'Legal', NOW);

describe('draftPerfNarrative (PRD §8.2 narrative)', () => {
  it('picks the rating>=4 branch text and includes SFIA gaps and compa-ratio', () => {
    const text = draftPerfNarrative(mariamCtx);
    expect(text).toContain('PERFORMANCE COMMENTARY — Mariam Khalifa (EMP-10001)');
    expect(text).toContain('has consistently delivered beyond the agreed objectives');
    expect(text).toContain('AML / sanctions compliance (L5→L6), Personal data protection (L4→L5)');
    expect(text).toContain('compa-ratio 0.97 (paid around band midpoint)');
    expect(text).toContain('Recommend talent-pool nomination and above-standard merit per the matrix.');
    expect(text).not.toContain('flagged as flight risk');
  });

  it('picks the rating===3 and rating<3 branches, and flags flight risk when set', () => {
    const solid = draftPerfNarrative({ ...mariamCtx, performance_rating: 3 });
    expect(solid).toContain('has fully met the objectives and standards of the role with reliable delivery');
    expect(solid).toContain('Recommend standard merit and progression on the assigned 3→4 development plan.');

    const developing = draftPerfNarrative({ ...mariamCtx, performance_rating: 2, flight_risk: true });
    expect(developing).toContain('has met some but not all objectives, with capability gaps limiting full delivery');
    expect(developing).toContain('Recommend reduced merit and close quarterly tracking of the assigned development plan.');
    expect(developing).toContain('flagged as flight risk (overqualified and under-paid); retention action advised');
  });

  it('reports "none — profile fully met" when there are no SFIA gaps', () => {
    const text = draftPerfNarrative({ ...mariamCtx, sfia_gaps: [] });
    expect(text).toContain('Development gaps: none — profile fully met.');
  });
});

describe('draftIdp (PRD §8.2 idp)', () => {
  it('threads the assigned plan fields and gap-driven tailoring', () => {
    const text = draftIdp(mariamCtx);
    expect(text).toContain('INDIVIDUAL DEVELOPMENT PLAN — Mariam Khalifa (EMP-10001) · Team Manager, M3');
    expect(text).toContain('Route: MGR-4-5 (4 → 5) · Personalized from the Management template');
    expect(text).toContain('close AML / sanctions compliance (L5→L6), Personal data protection (L4→L5)');
    expect(text).toContain('Specifically for Mariam: attach each action to live Legal work');
    expect(text).toContain('Pair with a rating-4/5 peer in Support Functions.');
    expect(text).toContain('Prioritize certification covering: AML / sanctions compliance and Personal data protection.');
    expect(text).not.toContain('RETENTION NOTE');
  });

  it('adds a RETENTION NOTE when flight_risk is set', () => {
    const text = draftIdp({ ...mariamCtx, flight_risk: true });
    expect(text).toContain('RETENTION NOTE — flight-risk flag active (compa 0.97, SFIA surplus 1)');
  });
});

describe('draftInterviewKit (PRD §8.2 interview)', () => {
  it('numbers competency questions per skill plus 2 fixed questions', () => {
    const text = draftInterviewKit({
      job: 'Head of Legal', grade: 'M2', department: 'Legal',
      skills: [{ code: 'RSKM', name: 'Risk management', lvl: 5 }, { code: 'GOVN', name: 'Governance', lvl: 5 }],
    });
    expect(text).toContain('INTERVIEW KIT — Head of Legal (M2) · Legal');
    expect(text).toContain('1. [RSKM · target L5] Walk me through a situation where you personally delivered risk management end-to-end');
    expect(text).toContain('2. [GOVN · target L5] Walk me through a situation where you personally delivered governance end-to-end');
    expect(text).toContain('3. [Values/UAE context]');
    expect(text).toContain('4. [Leadership]');
    expect(text).toContain('PASS GUIDANCE — average ≥3.5');
  });
});

describe('draftEvalNotes (PRD §8.2 evalnotes)', () => {
  it('matches the independently-verified pos/neg/score for a mixed-signal note', () => {
    const notes = 'Strong quantified delivery with a clear structured approach. However some areas were vague and the candidate struggled under pressure.';
    const text = draftEvalNotes({
      notes,
      skills: [{ name: 'Structured problem solving' }, { name: 'Data analytics' }, { name: 'Governance' }, { name: 'Audit' }],
    });
    expect(text).toContain('Structured problem solving: directly evidenced in notes.');
    expect(text).toContain('Data analytics: not directly evidenced — probe in next round.');
    expect(text).toContain('Strengths detected: strong, quantified, clear, structured');
    expect(text).toContain('Concerns detected: struggl, vague');
    expect(text).toContain('OVERALL SCORE — 5/5');
    expect(text).toContain('Progress to offer/panel: strong evidence at target level.');
  });
});

describe('inferSkills (PRD §8.2 skills)', () => {
  it('matches the independently-verified 8-hit, seniority-5 case', () => {
    const text = inferSkills(
      'Senior manager with 10 years experience. Led credit risk assessment and portfolio risk analysis using data analytics dashboards. Delivered process improvement automation initiatives. Managed stakeholder relationship and team mentoring. Delivered project outcomes. Compliance and regulatory oversight. Strategic planning lead.'
    );
    expect(text).toContain('RSKM — Risk management — L5 — evidence: "credit"');
    expect(text).toContain('DAAN — Data analytics — L5 — evidence: "data"');
    expect(text).toContain('BPRE — Business process improvement — L5 — evidence: "process improvement"');
    expect(text).toContain('RLMT — Stakeholder relationship management — L5 — evidence: "stakeholder"');
    expect(text).toContain('ETMG — Learning delivery / team leadership — L4 — evidence: "led"');
    expect(text).toContain('PRMG — Project management — L5 — evidence: "delivered"');
    expect(text).toContain('PEDP — Compliance / governance — L5 — evidence: "compliance"');
    expect(text).toContain('STPL — Strategic planning — L5 — evidence: "strateg"');
    expect(text).not.toContain('VISL');
    expect(text).toContain('SENIORITY READ — indicative level 5');
  });

  it('reports no confident inferences for unmatched text', () => {
    const text = inferSkills('Enjoys long walks and reading novels.');
    expect(text).toContain('No confident inferences — supply richer text.');
  });
});

describe('draftTalentTalkingPoints (PRD §8.2 talent)', () => {
  it('lists notables with flight-risk callout', () => {
    const text = draftTalentTalkingPoints({
      dist: '9-box distribution summary',
      notables: [
        { name: 'A. One', grade: 'M2', dept: 'Legal', cell: 'STAR', perf: 5, surplus: 6, flight: true, tip: 'Retain now.' },
        { name: 'B. Two', grade: 'C2', dept: 'HR', cell: 'Underperformer', perf: 1, surplus: 0, flight: false, tip: 'Confirm PIP.' },
      ],
    });
    expect(text).toContain('DISTRIBUTION\n9-box distribution summary');
    expect(text).toContain('A. One (M2, Legal) — STAR. Rating 5, SFIA surplus 6, FLIGHT RISK (underpaid + overqualified) — retention case. Retain now.');
    expect(text).toContain('B. Two (C2, HR) — Underperformer. Rating 1, SFIA surplus 0. Confirm PIP.');
  });
});

describe('draftScenarioNarrative (PRD §8.2 scenario)', () => {
  it('cost-down + healthy span + succession gap present', () => {
    const text = draftScenarioNarrative({ headline: 'Merge IT and Ops', baseCtc: 10000000, curCtc: 9500000, hc: 500, depts: 40, span: 7, succGaps: 2, moves: 3 });
    expect(text).toContain('COST — Annual CTC moves from AED 10.0M to AED 9.5M (−AED 500K)');
    expect(text).toContain('within the healthy 6–9 band');
    expect(text).toContain('2 critical role(s) currently lack a ready-in-1-year successor; any de-layering deepens this before it saves cost');
    expect(text).toContain('Bank the saving but stage it');
  });

  it('cost-up + wide span + no succession gaps', () => {
    const text = draftScenarioNarrative({ headline: 'Expand division', baseCtc: 10000000, curCtc: 10800000, hc: 550, depts: 42, span: 11, succGaps: 0, moves: 1 });
    expect(text).toContain('above the 8–9 comfort band; supervision and control risk rises');
    expect(text).toContain('0 critical role(s) currently lack a ready-in-1-year successor.');
    expect(text).toContain('Costs are up vs baseline: tie every addition to the pay line');
  });
});

describe('analyzeSentiment (PRD §8.2 sentiment)', () => {
  it('matches the independently-verified themes and per-division averages', () => {
    const text = analyzeSentiment([
      { div: 'Retail Banking Group', text: 'Workload is heavy and management is micromanaging us, feels unfair and I want to quit.' },
      { div: 'Retail Banking Group', text: 'Pay is under market and I am stuck with no promotion path.' },
      { div: 'Technology & Digital', text: 'Great flexible culture, love the support from my manager, systems are excellent.' },
    ]);
    expect(text).toContain('SURVEY SENTIMENT ANALYSIS — 3 comments');
    expect(text).toContain('• Manager: 2');
    expect(text).toContain('• Retail Banking Group: -3.00 (2 comments)  ⚠ RETENTION RISK');
    expect(text).toContain('• Technology & Digital: 5.00 (1 comments)');
    expect(text).toContain('Retail Banking Group shows the weakest sentiment');
  });
});

describe('draftLetter (PRD §8.2 letter)', () => {
  it('Offer Letter includes salary, division, department and UAE law reference', () => {
    const text = draftLetter(mariamCtx, 'Offer Letter', NOW);
    expect(text).toContain('B-WORK BANK (UAE) — HUMAN RESOURCES');
    expect(text).toContain('Date: 2026-09-22');
    expect(text).toContain('Dear Mariam Khalifa,');
    expect(text).toContain('Team Manager (Grade M3) in Legal, Support Functions');
    expect(text).toContain('AED 458,000 (AED 38,167/month) plus allowances of AED 160,500');
    expect(text).toContain('Federal Decree-Law No. 33 of 2021');
  });

  it('produces distinct, non-empty text for every document type', () => {
    const docs = ['Offer Letter', 'Employment Contract Summary', 'Promotion Letter', 'Warning Letter', 'No Objection Certificate (NOC)', 'Salary Certificate', 'Experience Certificate'] as const;
    const outputs = docs.map((d) => draftLetter(mariamCtx, d, NOW));
    outputs.forEach((o) => expect(o.length).toBeGreaterThan(50));
    expect(new Set(outputs).size).toBe(docs.length);
  });
});

describe('answerPolicyQuestion (PRD §8.2 policy)', () => {
  it('routes each recognized topic to its own grounded answer', () => {
    expect(answerPolicyQuestion('What is my EOSB gratuity?')).toContain('Art. 51');
    expect(answerPolicyQuestion('How much annual leave do I get?')).toContain('Art. 29');
    expect(answerPolicyQuestion('How long is probation?')).toContain('Art. 9');
    expect(answerPolicyQuestion('What is my notice period if I resign?')).toContain('Art. 43');
    expect(answerPolicyQuestion('What is my salary grade band?')).toContain('C3 → E1');
    expect(answerPolicyQuestion('How does merit bonus work?')).toContain('rating × compa-ratio matrix');
    expect(answerPolicyQuestion('What about Emiratization NAFIS?')).toContain('MOHRE');
  });

  it('falls back to the capability list for an unrecognized question', () => {
    expect(answerPolicyQuestion('What is the weather today?')).toContain('I can answer on: EOSB/gratuity');
  });
});

describe('draftCareerAdvice (PRD §8.2 career)', () => {
  it('computes the next grade, band midpoint move, and SFIA gaps to close', () => {
    const text = draftCareerAdvice(mariam, 'Support Functions', 'Risk & Control Functions', 'Legal');
    expect(text).toContain('Career path for Mariam Khalifa (M3 · Team Manager)');
    expect(text).toContain('NEXT MOVE — Grade M2:'); // M3's next per GRADE_ORDER
    expect(text).toContain('Your current rating is 4 (Exceeds Expectations)');
    expect(text).toContain('your assigned plan MGR-4-5 already targets this');
  });
});
