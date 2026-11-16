import { GRADE_LADDER } from './hay-constants';
import { HayEngine } from './hay';
import { compaRatio } from './eosb';
import { sfiaDeficit, sfiaSurplus } from './sfia-gap';
import { SFIA } from './sfia-catalogue';
import { perfPlanId } from './perf';
import { PERF_PLANS } from './perf-plans';
import type { PerfPlan } from './perf-plans';
import type { PerfRating } from './perf';
import { fmtAED, fmtN } from './format';
import type { Person } from './person';
import type { DepartmentInput, OrgModel, MoveVerdict } from './types';

// PRD 8.3 tab names for sidebar/fallback
export const TAB_NAMES: Record<string, string> = {
  org: 'Org Design', comp: 'Competency', sheet: 'Composite Sheet', jd: 'JD Studio',
  chart: 'Org Chart', rewards: 'Rewards', uae: 'UAE Compliance', talent: 'Talent',
  wfp: 'Workforce & Scenarios', perf: 'Performance', ai: 'AI Copilot Studio',
};

export const tabName = (tab: string): string => TAB_NAMES[tab] || tab;

// ---------- native intent router ----------
export type CopilotIntent =
  | 'why-invalid' | 'reporting-line' | 'scenario' | 'okrs' | 'manager-help'
  | 'gap-path' | 'reeval' | 'equity' | 'policy' | 'fallback';

// PRD 8.3 keyword router, order as shipped
export function classifyIntent(query: string): CopilotIntent {
  const t = query.toLowerCase();
  if (/why.*(invalid|flag)|invalid|violat/.test(t)) return 'why-invalid';
  if (/reporting line|report to|who.*report/.test(t)) return 'reporting-line';
  if (/scenario|merge|combine|reduce.*headcount|cut|downsiz|change to \d+/.test(t)) return 'scenario';
  if (/okr|objective/.test(t)) return 'okrs';
  if (/manager.*(contribut|help|support|increase|improve)|coach.*(him|her|them)/.test(t)) return 'manager-help';
  if (/gap|learning|close|fill|develop.*skill|how do i .*(level|l\d)/.test(t)) return 'gap-path';
  if (/hay|re-?eval|next (pay )?grade|grade hike|increase.*(score|grade)|responsibilit/.test(t)) return 'reeval';
  if (/compa|equity|pay gap|outside band/.test(t)) return 'equity';
  if (/eosb|leave|probation|notice|policy/.test(t)) return 'policy';
  return 'fallback';
}

// ---- move rationale (chat text) ----
export interface MoveNarrativeInput {
  verdict: MoveVerdict;
  entity: string;
  entityType: string;
  toLabel: string;
}

export function formatMoveNarrative(v: MoveNarrativeInput | null): string {
  if (!v) return 'No structural move yet this session. Drag a department, sub-division or person in the Org Studio and I will assess it instantly.';
  const tag = v.verdict.verdict === 'VALID' ? 'VALID' : v.verdict.verdict === 'INVALID' ? 'INVALID' : 'REQUIRES HUMAN INSIGHT';
  return `${tag} — Move: ${v.entity} (${v.entityType}) → ${v.toLabel}\n• ` + v.verdict.reasons.join('\n• ') + (v.verdict.verdict === 'INVALID' ? '\n↩ Undo is armed — the structure remains editable until you accept.' : '');
}

// ---------- reporting-line tracing ----------
export interface ReportingLineDept {
  deptName: string;
  subdivisionName: string;
  divisionName: string;
}

export function formatReportingLine(dept: ReportingLineDept | null): string {
  if (dept) return `Reporting line for ${dept.deptName}: staff → Head of ${dept.deptName} → Head of ${dept.subdivisionName} → EVP ${dept.divisionName} → CEO. Moving the manager re-parents the whole chain instantly — JDs, org chart and Hay context re-sync automatically (watch the Ledger).`;
  return 'Reporting lines run staff → Department Head → Sub-division Head → Division EVP → CEO. Select or move a unit and I will trace its exact chain.';
}

// ---------- SFIA gap -> learning path ----------
export function draftGapLearningPath(
  person: Person | null,
  divName: string,
  subdivisionName: string,
  deptName: string
): string {
  if (!person) return 'Select a person (Competency tab, or ask me by name) and I will map their SFIA gaps to a learning path.';
  const surplus = sfiaSurplus(person, divName, subdivisionName, deptName);
  const def = sfiaDeficit(person, divName, subdivisionName, deptName);
  const planId = perfPlanId(person.perf as PerfRating, person.grade);
  if (!def.det.length) return `${person.name} fully meets the SFIA profile for ${person.job} (${person.grade}) — surplus ${surplus} pts. Recommend a stretch assignment from plan ${planId}.`;
  const rows = def.det.slice(0, 4).map((g) => {
    const s = SFIA.skills[g.c]?.name || g.c;
    return `• ${s}: L${g.have} → L${g.req}. Path: shadow a L${g.req}+ practitioner on live ${deptName} work (70%) · monthly coaching review (20%) · targeted ${s} certification/e-learning (10%).`;
  });
  return `SFIA gaps — ${person.name} (${person.job}, ${person.grade}):\n` + rows.join('\n') + `\nAnchor all three to plan ${planId}; re-assess in one quarter.`;
}

// ---- Hay re-eval levers ----
export function draftHayReevaluation(dept: DepartmentInput | null, model: OrgModel): string {
  if (!dept) return 'Pick a department (Competency selector or name one in chat) and I will model the Hay re-evaluation case for its Head role.';
  const cur = HayEngine.evaluate(dept, model);
  const idx = GRADE_LADDER.findIndex(([, g]) => g === cur.grade);
  if (idx <= 0) return `Head of ${dept.department} is already ${cur.grade} (${cur.total} pts) — top of the ladder; no upward re-evaluation available.`;
  const [nextMin, nextGrade] = GRADE_LADDER[idx - 1];
  const need = nextMin - cur.total;
  const sim = (patch: Partial<Pick<DepartmentInput, 'hc' | 'base'>>) => HayEngine.evaluate({ ...dept, ...patch }, model).total;
  const levers: [string, number][] = [];
  if (dept.hc < 60) levers.push(['Scale the unit to ≥60 HC (Know-How E→E+)', sim({ hc: 60 })]);
  if (dept.hc >= 60 && dept.hc < 150) levers.push(['Scale the unit to ≥150 HC (Know-How →F, Freedom-to-Act →E)', sim({ hc: 150 })]);
  if (dept.base < 12e6) levers.push(['Grow controlled cost/portfolio to ≥ AED 12M (Accountability magnitude 2)', sim({ base: 12e6 })]);
  if (dept.base >= 12e6 && dept.base < 25e6) levers.push(['Grow controlled cost/portfolio to ≥ AED 25M (Accountability magnitude 3)', sim({ base: 25e6 })]);
  const lines = levers.map(([desc, pts]) => `• ${desc} → ~${pts} pts ${pts >= nextMin ? '✅ crosses the ' + nextGrade + ' line' : '(+' + (pts - cur.total) + ')'}`);
  return `RE-EVALUATION MODEL — Head of ${dept.department}\nCurrent: ${cur.total} pts = ${cur.grade} (KH ${cur.kh.pts} · PS ${cur.ps.pts} · ACC ${cur.acc.pts}). Next grade ${nextGrade} at ${nextMin} pts — gap ${need} pts.\nStructural levers:\n${lines.join('\n') || '• Scope levers exhausted — the case must come from responsibility content.'}\nJD/SFIA additions that justify the case: add enterprise-level accountabilities (own a bank-wide policy or P&L line), raise Strategic Planning & Financial Management SFIA requirements to L5–6, and add cross-divisional decision rights. Route via the auto-raised re-banding case to the Rewards Committee — never re-grade on drift alone.`;
}

// ---- scenario builder ----
export interface UnitRef {
  name: string;
  type: 'division' | 'department';
  hc: number;
  base: number;
}

// PRD 8.3 fuzzy unit-name match
export function findUnits(text: string, units: UnitRef[]): UnitRef[] {
  const t = text.toLowerCase();
  return units.filter((u) => u.name.length > 2 && t.includes(u.name.toLowerCase().split(' ')[0])).slice(0, 4);
}

export function draftScenario(query: string, units: UnitRef[], orgHc: number): string | null {
  const pctMatch = query.match(/(\d{1,2})\s*%/);
  const pct = pctMatch ? pctMatch[1] : null;
  const merge = /merge|combine|consolidat/.test(query.toLowerCase());
  const matched = findUnits(query, units);
  if (!merge && !pct && !matched.length) return null;
  const hc = matched.reduce((a, u) => a + u.hc, 0) || orgHc;
  const base = matched.reduce((a, u) => a + u.base, 0);
  const cut = pct ? Math.round((hc * Number(pct)) / 100) : 0;
  const saveBase = pct ? Math.round((base * Number(pct)) / 100) : 0;
  return `SCENARIO DRAFT${merge ? ' — MERGER' : ''}\nUnits in scope: ${matched.map((u) => `${u.name} (${u.type})`).join(' + ') || 'entire bank'} · combined ${fmtN(hc)} HC${base ? ' · base ' + fmtAED(base) : ''}.\n${pct ? `Headcount reduction ${pct}% ≈ ${fmtN(cut)} roles → annual base saving ~${fmtAED(saveBase)} (CTC saving higher with loadings). One-off separation cost estimate ≈ ${fmtAED(Math.round(saveBase * 0.35))} (notice + EOSB blend).` : 'No reduction % given — tell me e.g. "reduce headcount by 10%".'}\n${merge ? 'Merger note: expect 1 consolidated leadership layer; run my move-assessment on each department drag so grading and spans stay legal.\n' : ''}Parameter setup → Workforce & Scenarios tab: use Restructure Modeler for the cuts (it prices redundancy vs redeployment per person) and drag the departments in Org Studio for the merge — I will validate every move. Say "change to 15%" to re-model.`;
}

// ---------- OKRs & manager coaching ----------
export function draftOkrs(person: Person, deptName: string, divName: string, subdivisionName: string): string {
  const def = sfiaDeficit(person, divName, subdivisionName, deptName);
  const gapNames = def.det.slice(0, 3).map((g) => SFIA.skills[g.c]?.name || g.c);
  const g1 = gapNames[0] || 'core discipline';
  const g2 = gapNames[1] || 'stakeholder management';
  const planId = perfPlanId(person.perf as PerfRating, person.grade);
  return `OKRs — ${person.name} (${person.job}, rating ${person.perf}) · next cycle\n\nO1. Close the ${g1} capability gap and apply it to live work.\n  KR1 Certified / assessed at required SFIA level by Q2.\n  KR2 Deliver 2 ${deptName} deliverables using ${g1} accepted first-time.\n  KR3 Zero rework/control findings on owned outputs.\n\nO2. Lift performance from ${person.perf} toward ${Math.min(5, person.perf + 1)} on plan ${planId}.\n  KR1 100% of quarterly plan milestones met.\n  KR2 ${g2} evidenced in 360 feedback ≥4/5.\n\nO3. Multiply the team.\n  KR1 Mentor 1 junior with a measurable skill-level lift.\n  KR2 Document 2 reusable practices in the department playbook.`;
}

export function draftManagerCoachingScript(person: Person, deptName: string): string {
  const planId = perfPlanId(person.perf as PerfRating, person.grade);
  const pl: Partial<PerfPlan> = PERF_PLANS[planId] || {};
  return `How the manager lifts ${person.name} (rating ${person.perf}):\n• Contract the ${pl.trans || ''} plan formally — dates, evidence, review rhythm (${pl.time || 'quarterly'}).\n• Delegate one visible stretch piece from ${deptName} tied to the 70% actions: "${(pl.otj || '').split(';')[0]}".\n• Run monthly 30-min evidence reviews — score against the exit criteria, not impressions.\n• Broker exposure: ${(pl.coach || '').split(';')[0]}.\n• Remove blockers publicly, correct privately; log wins to the calibration file so the next rating defends itself.`;
}

// ---------- pay equity snapshot ----------
export interface EquitySnapshot {
  avgCompaRatio: string;
  belowBand: number;
  aboveBand: number;
  totalEmployees: number;
}

export function computeEquitySnapshot(people: Person[]): EquitySnapshot {
  let lo = 0;
  let hi = 0;
  let sum = 0;
  people.forEach((p) => {
    const c = compaRatio(p);
    sum += c;
    if (c < 0.9) lo++;
    else if (c > 1.1) hi++;
  });
  return { avgCompaRatio: (sum / people.length).toFixed(2), belowBand: lo, aboveBand: hi, totalEmployees: people.length };
}

export function formatEquitySnapshot(e: EquitySnapshot): string {
  return `Pay equity snapshot: avg compa-ratio ${e.avgCompaRatio} across ${fmtN(e.totalEmployees)} employees · ${fmtN(e.belowBand)} below 0.90 (under-band risk) · ${fmtN(e.aboveBand)} above 1.10 (over-band). Priority: rating-4/5 employees under 0.90 — cross-check the Flight-Risk overlay and fund from the Merit Matrix.`;
}

// ---- person lookup ----
export function findPersonByName(query: string, people: Person[]): Person | null {
  const t = query.toLowerCase();
  return (
    people.find((p) => {
      const parts = p.name.toLowerCase().split(' ');
      return parts.some((w) => w.length > 3 && t.includes(w));
    }) || null
  );
}

// ---------- capability hint fallback ----------
export function formatFallbackHelp(tab: string, selectedPersonName: string | null): string {
  return `I'm watching the ${tabName(tab)} tab${selectedPersonName ? ' with ' + selectedPersonName + ' selected' : ''}. Ask me: "Why was this move flagged?" · "How do I fill the L4 gap for <name>?" · "What raises Head of <dept> to the next grade?" · "Create a scenario merging X and Y with 10% reduction" · "Draft 3 OKRs for <name>".`;
}
