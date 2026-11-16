import { gradeMid } from './eosb';
import { sfiaDeficit } from './sfia-gap';
import { SFIA } from './sfia-catalogue';
import { GRADE_JOBS } from './person';
import { perfLabel, perfPlanId } from './perf';
import { fmtAED, fmtN } from './format';
import type { GeneratorContext } from './native-gen-context';
import type { PerfPlan } from './perf-plans';
import type { PerfRating } from './perf';
import type { Person } from './person';

const gapLine = (gaps: GeneratorContext['sfia_gaps']): string =>
  gaps.length ? gaps.map((g) => `${g.skill} (L${g.have}→L${g.required})`).join(', ') : 'none — profile fully met';

// appraisal narrative
export function draftPerfNarrative(c: GeneratorContext): string {
  const crTxt = c.compa_ratio < 0.9 ? 'paid below band midpoint' : c.compa_ratio > 1.1 ? 'paid above band midpoint' : 'paid around band midpoint';
  return `PERFORMANCE COMMENTARY — ${c.name} (${c.id})
${c.name}, ${c.job} (${c.grade}) in ${c.department}, is rated ${c.performance_rating} — ${c.rating_label}. Over ${c.tenure_years} years of service the incumbent ${c.performance_rating >= 4 ? 'has consistently delivered beyond the agreed objectives, visibly lifting team outcomes' : c.performance_rating === 3 ? 'has fully met the objectives and standards of the role with reliable delivery' : 'has met some but not all objectives, with capability gaps limiting full delivery'}.

CAPABILITY EVIDENCE (SFIA)
Development gaps: ${gapLine(c.sfia_gaps)}. SFIA surplus vs role: ${c.sfia_surplus_pts} pts${c.flight_risk ? ' — flagged as flight risk (overqualified and under-paid); retention action advised' : ''}.

CALIBRATION JUSTIFICATION
The rating is consistent with peers at ${c.grade}: compa-ratio ${c.compa_ratio} (${crTxt}), development route ${c.dev_plan}. ${c.performance_rating >= 4 ? 'Recommend talent-pool nomination and above-standard merit per the matrix.' : c.performance_rating === 3 ? 'Recommend standard merit and progression on the assigned 3→4 development plan.' : 'Recommend reduced merit and close quarterly tracking of the assigned development plan.'}

RATING RATIONALE
Rating ${c.performance_rating}/5 reflects delivery vs objectives, SFIA capability position and behavioural evidence. DRAFT — manager to edit before submission.`;
}

// personalized 70/20/10 IDP
export function draftIdp(c: GeneratorContext): string {
  const pl: Partial<PerfPlan> = c.plan || {};
  return `INDIVIDUAL DEVELOPMENT PLAN — ${c.name} (${c.id}) · ${c.job}, ${c.grade}
Route: ${c.dev_plan} (${pl.trans || ''}) · Personalized from the ${pl.stream || ''} template

OBJECTIVE
${pl.obj || ''} Tailored priority: close ${gapLine(c.sfia_gaps)}.

70% — EXPERIENCE (on the job)
${pl.otj || ''} Specifically for ${c.name.split(' ')[0]}: attach each action to live ${c.department} work and make the top SFIA gap the first-quarter focus.

20% — EXPOSURE (coaching)
${pl.coach || ''} Pair with a rating-4/5 peer in ${c.division}.

10% — EDUCATION (formal)
${pl.learn || ''} Prioritize certification covering: ${c.sfia_gaps.slice(0, 2).map((g) => g.skill).join(' and ') || 'core discipline'}.

TIMELINE — ${pl.time || '12 months'}
SUCCESS MEASURES — ${pl.exit || ''}${c.flight_risk ? '\nRETENTION NOTE — flight-risk flag active (compa ' + c.compa_ratio + ', SFIA surplus ' + c.sfia_surplus_pts + '). Review pay positioning at the next cycle.' : ''}
DRAFT — manager + HRBP to localise and sign off.`;
}

export interface InterviewContext {
  job: string;
  grade: string;
  department: string;
  skills: { code: string; name: string; lvl: number }[];
}

// SFIA questions + rubric
export function draftInterviewKit(c: InterviewContext): string {
  const qs = c.skills.map(
    (s, i) => `${i + 1}. [${s.code} · target L${s.lvl}] Walk me through a situation where you personally delivered ${s.name.toLowerCase()} end-to-end in a financial-services context. What did you own, what went wrong, and what was the measurable outcome?`
  );
  qs.push(
    `${c.skills.length + 1}. [Values/UAE context] Describe a time you balanced commercial pressure against a control or compliance requirement. What did you escalate and why?`,
    `${c.skills.length + 2}. [Leadership] Tell me about developing someone junior — what changed in their performance and how did you measure it?`
  );
  return `INTERVIEW KIT — ${c.job} (${c.grade}) · ${c.department}\n\nCOMPETENCY QUESTIONS\n${qs.join('\n\n')}\n\nSCORING RUBRIC (per question)\n5 — Specific, personally-owned example; quantified outcome; reflects target SFIA level or above.\n4 — Strong specific example; outcome partially quantified; at target level.\n3 — Credible example at/near target level; limited measurement or shared ownership.\n2 — Generic or theoretical; below target level; weak ownership.\n1 — No relevant evidence; contradicts values or control expectations.\n\nPASS GUIDANCE — average ≥3.5 with no question below 2; probe any 2 with a follow-up before concluding.`;
}

export interface EvalNotesContext {
  notes: string;
  skills: { name: string }[];
}

// notes -> evaluation
export function draftEvalNotes(c: EvalNotesContext): string {
  const t = (c.notes || '').toLowerCase();
  const pos = ['well', 'strong', 'good', 'quantified', 'clear', 'excellent', 'confident', 'structured'].filter((w) => t.includes(w));
  const neg = ['struggl', 'weak', 'vague', 'unclear', 'poor', 'failed', 'no ', 'not '].filter((w) => t.includes(w));
  const score = Math.max(1, Math.min(5, 3 + pos.length - neg.length));
  return `STRUCTURED EVALUATION (from raw notes)\n\nOBSERVATIONS BY COMPETENCY\n${c.skills
    .slice(0, 4)
    .map((s) => `• ${s.name}: ${t.includes(s.name.toLowerCase().split(' ')[0]) ? 'directly evidenced in notes' : 'not directly evidenced — probe in next round'}.`)
    .join('\n')}\n\nSIGNALS\nStrengths detected: ${pos.length ? pos.join(', ') : '—'}\nConcerns detected: ${neg.length ? neg.join(', ').trim() : '—'}\n\nOVERALL SCORE — ${score}/5\nRECOMMENDATION — ${score >= 4 ? 'Progress to offer/panel: strong evidence at target level.' : score === 3 ? 'Second interview: credible but verify the flagged gaps.' : 'Do not progress at this grade: insufficient evidence vs the rubric.'}\nDRAFT — interviewer to confirm before recording in the ATS.`;
}

const SKILLS_MAP: [RegExp, string, string][] = [
  [/credit|underwrit|ifrs|portfolio risk/, 'RSKM', 'Risk management'],
  [/data|analytic|dashboard|python|sql/, 'DAAN', 'Data analytics'],
  [/visuali|report/, 'VISL', 'Data visualisation'],
  [/process improvement|automation|lean/, 'BPRE', 'Business process improvement'],
  [/stakeholder|relationship|client/, 'RLMT', 'Stakeholder relationship management'],
  [/team|managed|led|mentor/, 'ETMG', 'Learning delivery / team leadership'],
  [/project|delivered|drove/, 'PRMG', 'Project management'],
  [/compliance|regulat/, 'PEDP', 'Compliance / governance'],
  [/strateg/, 'STPL', 'Strategic planning'],
];

// text -> SFIA skills
export function inferSkills(text: string): string {
  const t = (text || '').toLowerCase();
  const sen = /senior|lead|manager|head|9 years|10 years|director/.test(t) ? 5 : /officer|analyst|3 years|4 years/.test(t) ? 3 : 4;
  const hits = SKILLS_MAP.filter(([re]) => re.test(t));
  const lines = hits
    .map(([re, code, name]) => `${code} — ${name} — L${Math.max(2, sen - (code === 'ETMG' ? 1 : 0))} — evidence: "${(t.match(re) || [''])[0]}"`)
    .join('\n');
  return `INFERRED SFIA PROFILE (from supplied text)\n\n${lines || 'No confident inferences — supply richer text.'}\n\nSENIORITY READ — indicative level ${sen} (from tenure/leadership language).\nCONFIDENCE — inference only; confirm with the employee/manager before the profile drives 9-box or succession. Click "Apply to profile" to write these levels onto the selected employee.`;
}

export interface TalentNotable {
  name: string;
  grade: string;
  dept: string;
  cell: string;
  perf: number;
  surplus: number;
  flight: boolean;
  tip: string;
}

export interface TalentTalkingPointsContext {
  dist: string;
  notables: TalentNotable[];
}

// 9-box talking points
export function draftTalentTalkingPoints(c: TalentTalkingPointsContext): string {
  return `TALENT REVIEW — CALIBRATION TALKING POINTS\n\nDISTRIBUTION\n${c.dist}\n\nINDIVIDUALS WORTH DISCUSSING\n${c.notables
    .map((n) => `• ${n.name} (${n.grade}, ${n.dept}) — ${n.cell}. Rating ${n.perf}, SFIA surplus ${n.surplus}${n.flight ? ', FLIGHT RISK (underpaid + overqualified) — retention case' : ''}. ${n.tip}`)
    .join('\n')}\n\nACTIONS\n1. Confirm ratings 5 and 1 first — the tails drive merit and PIP budgets.\n2. Resolve every flight-risk star this cycle: pay positioning or mobility move.\n3. Feed agreed moves into the Mobility Marketplace and Succession bench before closing the session.\nDRAFT — facilitator to adapt live.`;
}

export interface ScenarioNarrativeContext {
  headline: string;
  baseCtc: number;
  curCtc: number;
  hc: number;
  depts: number;
  span: number;
  succGaps: number;
  moves: number;
}

// exec narrative
export function draftScenarioNarrative(c: ScenarioNarrativeContext): string {
  return `EXECUTIVE SCENARIO NARRATIVE\n\n${c.headline}\n\nCOST — Annual CTC moves from ${fmtAED(c.baseCtc)} to ${fmtAED(c.curCtc)} (${c.curCtc >= c.baseCtc ? '+' : ''}${fmtAED(c.curCtc - c.baseCtc)}). Headcount ${fmtN(c.hc)} across ${c.depts} departments.\nSPAN OF CONTROL — averaging ${c.span} directs per manager${c.span > 9 ? ' — above the 8–9 comfort band; supervision and control risk rises' : ' — within the healthy 6–9 band'}.\nSUCCESSION — ${c.succGaps} critical role(s) currently lack a ready-in-1-year successor${c.succGaps > 0 ? '; any de-layering deepens this before it saves cost' : ''}.\nSTRUCTURAL MOVES — ${c.moves} change(s) applied this session (see Ledger).\n\nRECOMMENDATION — ${c.curCtc < c.baseCtc ? 'Bank the saving but stage it: protect succession-critical layers, hold spans ≤9, and re-run pay-equity before implementation.' : 'Costs are up vs baseline: tie every addition to the pay line and revisit spans before approving.'}\nDRAFT — for ExCo pre-read; figures recalc live with the model.`;
}

export interface SentimentComment {
  div: string;
  text: string;
}

const SENTIMENT_THEME_PATTERNS: [string, RegExp][] = [
  ['Pay', /under-?paid|pay|salary/],
  ['Workload', /workload|hours|burnout/],
  ['Manager', /manager|micromanag/],
  ['Career', /career|promotion|stuck/],
  ['Systems', /system|tools|slow|manual/],
  ['Recognition', /recogni|apprecia/],
];

// survey themes
export function analyzeSentiment(comments: SentimentComment[]): string {
  const byDiv = new Map<string, number[]>();
  const themes: Record<string, number> = { Pay: 0, Workload: 0, Manager: 0, Career: 0, Systems: 0, Recognition: 0 };
  const POS_WORDS = ['great', 'love', 'support', 'proud', 'excellent', 'good', 'flexible'];
  const NEG_WORDS = ['not', 'no ', 'poor', 'under', 'stuck', 'leave', 'quit', 'burnout', 'slow', 'micromanag', 'unfair'];

  comments.forEach((cm) => {
    const t = cm.text.toLowerCase();
    let s = 0;
    POS_WORDS.forEach((w) => { if (t.includes(w)) s++; });
    NEG_WORDS.forEach((w) => { if (t.includes(w)) s--; });
    if (!byDiv.has(cm.div)) byDiv.set(cm.div, []);
    byDiv.get(cm.div)!.push(s);
    SENTIMENT_THEME_PATTERNS.forEach(([key, re]) => { if (re.test(t)) themes[key]++; });
  });

  const rows = [...byDiv.entries()]
    .map(([d, arr]) => ({ d, n: arr.length, avg: arr.reduce((a, b) => a + b, 0) / arr.length }))
    .sort((a, b) => a.avg - b.avg);

  const sortedThemes = Object.entries(themes).sort((a, b) => b[1] - a[1]);
  return `SURVEY SENTIMENT ANALYSIS — ${comments.length} comments\n\nTHEMES (mentions)\n${sortedThemes.map(([k, v]) => `• ${k}: ${v}`).join('\n')}\n\nSENTIMENT BY DIVISION (−neg … +pos)\n${rows.map((r) => `• ${r.d}: ${r.avg.toFixed(2)} (${r.n} comments)${r.avg < -0.3 ? '  ⚠ RETENTION RISK' : ''}`).join('\n')}\n\nFLAGS & ACTIONS\n1. ${rows[0] ? rows[0].d : '—'} shows the weakest sentiment — pair with the Flight-Risk overlay and run stay interviews.\n2. Top theme "${sortedThemes[0][0]}" — assign an owner and a 90-day fix.\n3. Re-pulse in one quarter and trend against attrition.\nDRAFT — anonymised aggregate only; never attribute comments to individuals.`;
}

export type LetterDocType =
  | 'Offer Letter' | 'Employment Contract Summary' | 'Promotion Letter' | 'Warning Letter'
  | 'No Objection Certificate (NOC)' | 'Salary Certificate' | 'Experience Certificate';

// HR doc factory
export function draftLetter(c: GeneratorContext, doc: LetterDocType, now: Date = new Date()): string {
  const today = now.toISOString().slice(0, 10);
  const monthly = Math.round(c.annual_base_AED / 12);
  const H = `NORTHWIND GROUP (UAE) — HUMAN RESOURCES\nDate: ${today}\nRef: HR/${doc.replace(/[^A-Z]/gi, '').slice(0, 4).toUpperCase()}/${c.id}\n\n`;
  const S = `\n\nSincerely,\nHuman Resources Department, Northwind Group (UAE)\n[AUTHORISED SIGNATORY] · This document is system-generated for review and is not valid until signed.`;
  const L: Record<LetterDocType, string> = {
    'Offer Letter': `${H}Dear ${c.name},\n\nWe are pleased to offer you the position of ${c.job} (Grade ${c.grade}) in ${c.department}, ${c.division}. Annual base salary: AED ${fmtN(c.annual_base_AED)} (AED ${fmtN(monthly)}/month) plus allowances of AED ${fmtN(c.allowances_AED)} per annum. Employment is subject to a probation period and the terms of UAE Federal Decree-Law No. 33 of 2021. Benefits include medical insurance, annual air ticket and end-of-service gratuity per law.\n\nPlease sign and return by [DATE].${S}`,
    'Employment Contract Summary': `${H}CONTRACT SUMMARY — ${c.name} (${c.id})\nPosition: ${c.job}, Grade ${c.grade}, ${c.department}\nContract type: Fixed-term (renewable) per Art. 8, Federal Decree-Law 33/2021\nRemuneration: AED ${fmtN(c.annual_base_AED)} base + AED ${fmtN(c.allowances_AED)} allowances p.a.\nLeave: 30 calendar days annual leave (Art. 29); sick leave per Art. 31; EOSB per Art. 51.\nNotice: as per contract, within statutory 30–90 days.${S}`,
    'Promotion Letter': `${H}Dear ${c.name},\n\nCongratulations. Effective [DATE], you are promoted to [NEW TITLE] at Grade [NEW GRADE] in ${c.department}. Your revised annual base salary is AED [NEW SALARY], positioned within the governing band. This reflects your performance rating of ${c.performance_rating} (${c.rating_label}) and completion of plan ${c.dev_plan}. All other terms remain unchanged.${S}`,
    'Warning Letter': `${H}PRIVATE & CONFIDENTIAL — ${c.name} (${c.id})\n\nThis letter constitutes a formal written warning under Art. 39, Federal Decree-Law 33/2021 and company disciplinary policy, further to the concerns discussed on [DATE] regarding [SPECIFIC CONDUCT/PERFORMANCE]. You are currently rated ${c.performance_rating} (${c.rating_label}) and assigned ${c.dev_plan}. Failure to meet the documented standards within [PERIOD] may lead to further disciplinary action up to termination.\n\nYou may respond in writing within 5 working days.${S}`,
    'No Objection Certificate (NOC)': `${H}TO WHOM IT MAY CONCERN\n\nThis is to certify that ${c.name} (${c.id}), holder of passport [NUMBER], is employed with Northwind Group (UAE) as ${c.job} in ${c.department} since [START DATE], drawing a monthly salary of AED ${fmtN(monthly)}. The company has no objection to the above employee [PURPOSE — e.g. applying for a visit visa / opening a bank account / obtaining a driving licence].${S}`,
    'Salary Certificate': `${H}TO WHOM IT MAY CONCERN — SALARY CERTIFICATE\n\nThis certifies that ${c.name} (${c.id}) is a full-time employee of Northwind Group (UAE), ${c.job}, Grade ${c.grade}, ${c.department}. Current remuneration: monthly basic AED ${fmtN(Math.round(monthly * 0.6))}, allowances AED ${fmtN(Math.round(monthly * 0.4 + c.allowances_AED / 12))}, total monthly AED ${fmtN(monthly + Math.round(c.allowances_AED / 12))}. Tenure: ${c.tenure_years} years. Issued at the employee's request without liability to the company.${S}`,
    'Experience Certificate': `${H}TO WHOM IT MAY CONCERN — EXPERIENCE CERTIFICATE\n\nThis certifies that ${c.name} (${c.id}) has been employed with Northwind Group (UAE) as ${c.job} in ${c.department}, ${c.division}, for ${c.tenure_years} years. During this period the employee's most recent performance rating was ${c.performance_rating} (${c.rating_label}). Accrued end-of-service gratuity as of today is estimated at AED ${fmtN(c.eosb_today_AED)} per Art. 51, Federal Decree-Law 33/2021. We wish them success.${S}`,
  };
  return L[doc];
}

// UAE law assistant
export function answerPolicyQuestion(q: string): string {
  const t = (q || '').toLowerCase();
  const cite = (c: string): string => `\n\n📎 ${c}\nℹ Figures are indicative — HR confirms final amounts. (Native engine — switch to Live AI for free-form answers.)`;
  if (/eosb|gratuity|end.of.service/.test(t))
    return `End-of-service gratuity (EOSB) under Art. 51, Federal Decree-Law 33/2021: 21 days' basic pay per year for the first 5 years of service, 30 days per year thereafter, capped at 24 months' pay; resignation does not reduce the entitlement under the current law. Example at AED 10,000 monthly basic with 6 years' service: (21/30×10,000×5) + (30/30×10,000×1) = AED 45,000. Basic pay in this company is modelled at 60% of gross.` + cite("UAE Labour Law Art. 51 · Company Policy HR-REM-04 (EOSB)");
  if (/leave|vacation|annual/.test(t))
    return `Annual leave: 30 calendar days per completed year of service (Art. 29). Sick leave: 90 days per year — first 15 full pay, next 30 half pay, remainder unpaid (Art. 31). Maternity: 60 days (45 full + 15 half pay, Art. 30). Leave must be scheduled with your manager; carry-over follows company policy HR-LVE-02.` + cite('UAE Labour Law Arts. 29–31 · Company Policy HR-LVE-02');
  if (/probation/.test(t))
    return `Probation is a maximum of 6 months (Art. 9). Termination during probation requires 14 days' written notice; resignation to join another UAE employer requires 1 month. Confirmation follows the 30/60/90-day checkpoints in the Onboarding module.` + cite('UAE Labour Law Art. 9 · Company Policy HR-ONB-01');
  if (/notice|resign/.test(t))
    return `Notice periods run 30–90 days as stated in your contract (Art. 43). During notice you remain on full pay and duties; one paid day per week is allowed for job search after notice is served. Your EOSB is unaffected by resignation under the current law.` + cite('UAE Labour Law Art. 43 · Company Policy HR-SEP-01');
  if (/band|salary range|pay range|grade/.test(t))
    return `Pay is governed by 13 grade bands (C3 → E1), each with a minimum, midpoint and maximum fitted to the company's pay line (see Rewards tab). Example midpoints: P3 ≈ ${fmtAED(gradeMid('P3'))}, M1 ≈ ${fmtAED(gradeMid('M1'))} annually. Your position in band (compa-ratio) drives merit per the matrix.` + cite('Company Policy HR-REM-01 (Job Architecture & Bands)');
  if (/bonus|increment|merit/.test(t))
    return `Merit increases follow the rating × compa-ratio matrix (Performance tab): e.g. rating 4 below 0.90 compa attracts the top guideline, rating 1 attracts none while on PIP. Bonus targets are set as monthly-salary multiples by career stream. Payouts require a completed appraisal.` + cite('Company Policy HR-REM-03 (Merit & Bonus) · Performance module');
  if (/emirati|nafis|national/.test(t))
    return `The company tracks Emiratization against MOHRE targets (UAE Compliance tab) and runs NAFIS-linked development cohorts. UAE Nationals have access to dedicated development plans in the plan library and priority succession slating for critical roles.` + cite('MOHRE Emiratization directives · Company Policy HR-NAT-01');
  return `I can answer on: EOSB/gratuity, annual & sick leave, probation, notice/resignation, pay bands & grades, merit & bonus, and Emiratization. Try: "What's my EOSB if I resign in March after 6 years?"` + cite('UAE Federal Decree-Law 33/2021 · Company HR policy suite');
}

const GRADE_ORDER = ['C3', 'C2', 'C1', 'P4', 'P3', 'P2', 'P1', 'M3', 'M2', 'M1', 'E3', 'E2', 'E1'];

// next role + gaps
export function draftCareerAdvice(person: Person, divName: string, subdivisionName: string, deptName: string): string {
  const idx = GRADE_ORDER.indexOf(person.grade);
  const nxt = GRADE_ORDER[Math.min(GRADE_ORDER.length - 1, idx + 1)];
  const roles = (GRADE_JOBS[nxt] || []).join(', ') || 'senior roles';
  const def = sfiaDeficit(person, divName, subdivisionName, deptName, nxt);
  const gaps = def.det.slice(0, 3).map((g) => `${SFIA.skills[g.c]?.name || g.c} (L${g.have}→L${g.req})`).join(', ') || 'none — you already meet the next-grade profile';
  return `Career path for ${person.name} (${person.grade} · ${person.job}):\n\nNEXT MOVE — Grade ${nxt}: typical roles are ${roles}. Band midpoint moves from ${fmtAED(gradeMid(person.grade))} to ${fmtAED(gradeMid(nxt))} annually.\nWHAT TO CLOSE — ${gaps}. Your current rating is ${person.perf} (${perfLabel(person.perf as PerfRating)}); sustained 4+ plus a closed SFIA gap is the strongest promotion case.\nHOW — your assigned plan ${perfPlanId(person.perf as PerfRating, person.grade)} already targets this: anchor the 70% actions to a visible ${deptName} initiative, and check the Mobility Marketplace (Talent tab) for open adjacencies.\n\nDRAFT guidance — confirm with your manager & HRBP.`;
}
