// PRD 5.9 FR-PRF-04: 70/20/10 library, verbatim
export interface PerfPlan {
  stream: string;
  trans: string;
  obj: string;
  focus: string;
  otj: string;
  coach: string;
  learn: string;
  time: string;
  exit: string;
}

export const PERF_PLANS: Record<string, PerfPlan> = {
  'PIP-01': {
    stream: 'All', trans: '1 → 2/3 (recovery)',
    obj: 'Restore performance to the full standard of the role within 90 days.',
    focus: 'Close the specific objective and behavioural gaps documented in the appraisal; re-establish control and quality discipline.',
    otj: 'Weekly re-contracted deliverables with the line manager; shadow a rating-4 peer on one core process; remove non-core tasks for the PIP period.',
    coach: 'Fortnightly structured check-ins with manager and HRBP; documented feedback after every milestone.',
    learn: 'Targeted refreshers only on the failed competencies (e.g. credit policy, operational risk, service standards).',
    time: '90 days — formal review at day 30 / 60 / 90.',
    exit: 'All PIP deliverables met at day 90 → re-rate at next cycle. Not met → employment decision per UAE Labour Law and bank policy.',
  },
  'STR-01': {
    stream: 'All', trans: '5 → sustain & stretch',
    obj: 'Retain and multiply an outstanding performer; prepare for the next critical role.',
    focus: 'Enterprise-level impact, succession readiness, knowledge transfer.',
    otj: 'Lead one cross-divisional initiative from the Workforce & Scenarios module; act as interim delegate for the next role up during leave cover.',
    coach: 'Executive sponsor mentoring; present twice yearly to ExCo; reverse-mentor a senior leader on AI/digital.',
    learn: 'Executive education or external certification aligned to the succession target role.',
    time: '12 months, quarterly sponsor review.',
    exit: 'Succession readiness moves to ready-now in the Talent module; retention risk stays low on the flight-risk overlay.',
  },
  'OPS-2-3': {
    stream: 'Operations', trans: '2 → 3',
    obj: 'Reach full, reliable delivery of the role standard.',
    focus: 'Accuracy, turnaround time, service and control discipline.',
    otj: 'Daily volume with quality checkpoints; own one end-to-end process; rotate through the exception queue under supervision.',
    coach: 'Buddy with a rating-4 officer; monthly coaching on error root-causes.',
    learn: 'Process, systems and service-standards refreshers; UAE conduct and AML basics.',
    time: '12 months, quarterly review.',
    exit: 'Error rate and TAT at team standard for two consecutive quarters; no control breaches; competency profile fully met.',
  },
  'OPS-3-4': {
    stream: 'Operations', trans: '3 → 4',
    obj: 'Deliver beyond own desk — lift team outcomes.',
    focus: 'Process improvement, multi-skilling, peer leadership.',
    otj: 'Own a small process-improvement initiative; cover two adjacent desks; act as first-line checker for the team.',
    coach: 'Mentor one junior officer; join the department quality forum.',
    learn: 'Lean/continuous-improvement foundation; intermediate systems certification.',
    time: '12 months, quarterly review.',
    exit: 'Measurable improvement delivered (TAT, error or cost); certified on two adjacent processes; peer feedback positive.',
  },
  'OPS-4-5': {
    stream: 'Operations', trans: '4 → 5',
    obj: 'Create department-level impact and readiness for team leadership.',
    focus: 'Leading others, change delivery, cross-department influence.',
    otj: 'Deputise for the team leader; lead one automation pilot with the transformation team; represent the department in a cross-functional project.',
    coach: 'Leadership shadowing with the Branch/Team Manager; sponsor-led career conversation twice a year.',
    learn: 'First-line leadership programme; certification aligned to the target C1/M3 role.',
    time: '12–18 months, quarterly review.',
    exit: 'Pilot delivered with quantified benefit; ready-in-1-year on the succession bench for a team-leader role.',
  },
  'PRO-2-3': {
    stream: 'Professional', trans: '2 → 3',
    obj: 'Meet the full professional standard of the role (SFIA profile).',
    focus: 'Technical depth, quality of analysis, stakeholder reliability.',
    otj: 'Deliver the core caseload with staged quality gates; close the two largest SFIA skill gaps flagged in the Competency module.',
    coach: 'Monthly technical coaching from a senior professional; structured feedback from two internal clients.',
    learn: 'Certification for the core discipline; SFIA-aligned e-learning path.',
    time: '12 months, quarterly review.',
    exit: 'SFIA required-vs-held gap closed to zero on core skills; deliverables accepted first-time by stakeholders for two quarters.',
  },
  'PRO-3-4': {
    stream: 'Professional', trans: '3 → 4',
    obj: 'Raise impact from own portfolio to cross-team outcomes.',
    focus: 'Complex problem-solving, initiative leadership, commercial awareness.',
    otj: 'Lead one department initiative end-to-end; take the most complex cases in the queue; present analysis directly to division leadership.',
    coach: 'Mentoring by an M-grade leader; join one bank-wide working group (e.g. Emiratization, digital).',
    learn: 'Advanced professional certification; influencing and executive-communication programme.',
    time: '12 months, quarterly review.',
    exit: 'Initiative delivered with quantified benefit; recognised SME for at least one domain; 360 feedback at target level.',
  },
  'PRO-4-5': {
    stream: 'Professional', trans: '4 → 5',
    obj: 'Enterprise-level professional impact; succession-ready for P1/M-grade.',
    focus: 'Thought leadership, enterprise influence, leading through others.',
    otj: 'Own a bank-level programme workstream; deputise for the department head in governance forums; publish two internal thought-leadership pieces.',
    coach: 'Executive mentor; exposure to Board/committee papers; lead a community of practice.',
    learn: 'Leadership-transition programme; external executive short course in the discipline.',
    time: '12–18 months, quarterly review.',
    exit: 'Named ready-in-1-year successor for a P1/M3 role in the Talent module; enterprise initiative benefits realised.',
  },
  'MGR-2-3': {
    stream: 'Management', trans: '2 → 3',
    obj: 'Bring the team to full, consistent delivery of its mandate.',
    focus: 'Core people leadership, performance management, control ownership.',
    otj: 'Reset team objectives and routines; run disciplined monthly performance dialogues; close audit/control findings owned by the team.',
    coach: 'HRBP-supported coaching on difficult conversations; peer manager buddy.',
    learn: 'Essentials of people management; UAE Labour Law for line managers; risk & control ownership.',
    time: '12 months, quarterly review.',
    exit: 'Team KPIs at standard for two consecutive quarters; zero overdue audit actions; team engagement stabilised.',
  },
  'MGR-3-4': {
    stream: 'Management', trans: '3 → 4',
    obj: 'Lift performance beyond own team — cross-unit outcomes.',
    focus: 'Talent building, cross-functional delivery, span-of-control effectiveness.',
    otj: 'Lead one cross-department project from the Org Design pipeline; build a succession bench for own key roles; improve one end-to-end process crossing team boundaries.',
    coach: 'Senior-leader mentor; participate in divisional talent reviews; 360 feedback with coaching debrief.',
    learn: 'Intermediate leadership programme; finance-for-managers; change leadership.',
    time: '12 months, quarterly review.',
    exit: 'Cross-unit project benefits delivered; two named successors per critical role; team engagement and retention above division average.',
  },
  'MGR-4-5': {
    stream: 'Management', trans: '4 → 5',
    obj: 'Division-level leadership impact; succession-ready for the next grade.',
    focus: 'Strategic leadership, transformation delivery, enterprise stewardship.',
    otj: 'Own a transformation initiative from the Workforce & Scenarios module; act for the division head during absences; sponsor an Emiratization development cohort.',
    coach: 'ExCo-level sponsor; external peer network; executive coaching.',
    learn: 'Executive leadership programme (banking academy or business-school equivalent).',
    time: '12–18 months, semi-annual sponsor review.',
    exit: 'Ready-now/ready-in-1 successor rating for the next-grade role; transformation benefits realised; leadership 360 at target.',
  },
  'EXE-2-3': {
    stream: 'Executive', trans: '2 → 3',
    obj: 'Restore full delivery of the executive mandate.',
    focus: 'Strategic delivery, governance discipline, stakeholder confidence.',
    otj: 'Re-contract the divisional scorecard with the CEO; personally close the top regulatory/board actions; reset the leadership team operating rhythm.',
    coach: 'Board-member or CEO mentoring; independent executive coach; structured stakeholder feedback.',
    learn: 'Targeted governance/regulatory masterclasses (CBUAE focus).',
    time: '9–12 months, monthly CEO review.',
    exit: 'Scorecard back to green; regulator/board confidence restored; leadership-team engagement recovering.',
  },
  'EXE-3-4': {
    stream: 'Executive', trans: '3 → 4',
    obj: 'Move from sound stewardship to visible enterprise value creation.',
    focus: 'Growth agenda, transformation, enterprise talent building.',
    otj: 'Sponsor one bank-level growth or efficiency programme; own a cross-divisional P&L improvement; chair one enterprise governance committee.',
    coach: 'External board exposure (subsidiary or industry body); CEO mentoring; executive 360.',
    learn: 'Advanced executive programme; digital/AI leadership immersion.',
    time: '12 months, quarterly CEO review.',
    exit: 'Programme value quantified and delivered; enterprise talent bench measurably stronger; 360 at target.',
  },
  'EXE-4-5': {
    stream: 'Executive', trans: '4 → 5',
    obj: 'Benchmark executive — shape the bank and the market.',
    focus: 'Enterprise strategy, market leadership, CEO-succession readiness.',
    otj: 'Lead the bank-level strategy refresh or a market-facing flagship; represent the bank with CBUAE and industry bodies; sponsor enterprise succession.',
    coach: 'Board mentoring; international peer exchange; external non-executive appointment where policy allows.',
    learn: 'Global executive programme; board-readiness certification.',
    time: '18–24 months, semi-annual Board People Committee review.',
    exit: 'Named in CEO/critical-role succession slate as ready-now or ready-in-1; flagship delivered; external market recognition.',
  },
};

// FR-PRF-06: roadmap card, static content
export interface PerfRoadmapModule {
  no: string;
  name: string;
  what: string;
  links: string;
  priority: 'P1' | 'P2' | 'P3';
}

export const PERF_MODULES: PerfRoadmapModule[] = [
  { no: '11', name: 'Recruitment & Position-Based ATS', what: 'Requisition-to-offer pipeline keyed to the Oracle position hierarchy, with offer pricing against the pay bands.', links: 'Feeds Org Chart & Workforce headcount · reads JD Studio, Band Structure, Emiratization targets.', priority: 'P1' },
  { no: '12', name: 'Onboarding & Probation', what: '30/60/90-day journeys and probation confirmation per UAE Labour Law; probation outcome becomes the first performance rating input.', links: 'Feeds Performance · reads JD Studio, Competency, UAE Compliance.', priority: 'P2' },
  { no: '13', name: 'Attendance, Leave & WPS Payroll', what: 'Leave accruals (annual, sick, maternity, Hajj), attendance and Wage Protection System file generation — the statutory cost engines beyond EOSB.', links: 'Feeds Cost-to-Company leave liability & UAE Compliance.', priority: 'P1' },
  { no: '14', name: 'Employee Relations & Disciplinary Tracker', what: 'Grievance, disciplinary and whistleblowing case management with UAE Labour Law article references; compliant downstream for PIP outcomes.', links: 'Feeds Flight-Risk Overlay & UAE Compliance · reads the PIP register here.', priority: 'P2' },
  { no: '15', name: 'Engagement & Pulse Surveys', what: 'Recurring engagement, eNPS and pulse measurement cut by the same Division/Department spine.', links: 'Feeds Flight-Risk Overlay & Talent reviews.', priority: 'P2' },
  { no: '16', name: 'Exit Management & Offboarding', what: 'Resignation-to-final-settlement workflow: notice, EOSB settlement, exit interviews, regretted-loss analytics.', links: 'Feeds Workforce attrition assumptions · reads the EOSB liability engine.', priority: 'P2' },
  { no: '17', name: 'HR Analytics & Predictive Attrition', what: 'Attrition prediction, promotion velocity, pay-equity regression and Emiratization trajectory forecasting on the same spine.', links: 'Reads every module; turns the descriptive dashboard predictive.', priority: 'P3' },
  { no: '18', name: 'Total Rewards Statements & Benefits Admin', what: 'Individual total-reward statements (base, variable, gratuity, medical, air ticket) and benefits enrolment.', links: 'Reads Cost-to-Company loadings & merit outcomes.', priority: 'P3' },
  { no: '19', name: 'Emiratization Development Hub', what: 'UAE-national pipelines, NAFIS integration, cohort programmes and MOHRE target forecasting — from measurement to action.', links: 'Feeds UAE Compliance targets & Succession bench · reads plan library here.', priority: 'P1' },
  { no: '20', name: 'Wellbeing & Occupational Health', what: 'Wellbeing programmes, medical-fitness tracking for regulated roles, workplace-incident logging.', links: 'Feeds HR Analytics & Engagement.', priority: 'P3' },
];
