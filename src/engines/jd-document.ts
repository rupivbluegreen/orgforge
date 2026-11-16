import { hashStr } from './person';
import { fmtAED } from './format';
import { draftJdNarrative, LEVEL_QUAL, LEVEL_EXP, COMMS } from './jd-narrative';
import type { JdRole, JdTechSkill } from './jd-narrative';

export interface JdBehSkill {
  code: string;
  name: string;
  lvl: number;
}

export interface JdHayFactor {
  pts: number;
  note: string;
  impact?: 'P' | 'C' | 'R';
}

// shape both Hay evaluate/indicative satisfy
export interface JdHayInput {
  kh: JdHayFactor;
  ps: JdHayFactor;
  acc: JdHayFactor;
  total: number;
  grade: string;
  indicative?: boolean;
}

export interface JdRoleRef extends JdRole {
  type: 'head' | 'person';
  personId?: string;
}

export const jdKey = (role: Pick<JdRoleRef, 'type' | 'dept' | 'personId'>): string =>
  role.type === 'head' ? `H::${role.dept}` : `P::${role.personId}`;

export interface JdBuildInput {
  role: JdRoleRef;
  isHead: boolean;
  deptHc: number;
  deptBase: number;
  hay: JdHayInput;
  grade: string;
  level: number;
  techList: (JdTechSkill & { cat: string })[];
  behList: JdBehSkill[];
  revision: number;
  generatedBy: string;
  now: Date;
}

export interface JobDescription {
  key: string;
  role_type: 'head' | 'person';
  doc_no: string;
  revision_no: string;
  date: string;
  job_title: string;
  job_grade: string;
  reports_to: string;
  division: string;
  department: string;
  section: string;
  job_objective: string;
  direct_reports: string;
  total_reports: string;
  accountabilities: string[];
  internal_comms: string;
  external_comms: string;
  min_qualifications: string;
  min_experience: string;
  job_skills: string;
  techList: (JdTechSkill & { cat: string })[];
  behList: JdBehSkill[];
  hay: { kh: JdHayFactor; ps: JdHayFactor; acc: JdHayFactor; total: number; grade: string; indicative: boolean };
  structural_context: string;
  generated_on: string;
  generated_by: string;
}

export function buildJobDescription(input: JdBuildInput): JobDescription {
  const { role, isHead, deptHc, deptBase, hay, grade, level: L, techList, behList, revision, generatedBy, now } = input;
  const key = jdKey(role);
  const reportsTo = isHead ? `Head of ${role.sub} — ${role.div}` : `Head of ${role.dept}`;
  const directReports = isHead
    ? Math.max(2, Math.min(9, Math.round(deptHc / 18)))
    : L >= 5 ? Math.max(2, Math.round(deptHc / 40)) : 0;
  const totalReports = isHead ? deptHc : L >= 5 ? Math.round(deptHc / 6) : 0;
  const comms = COMMS[role.sub] || COMMS['Business Support'];

  const narrative = draftJdNarrative({
    role: { label: role.label, dept: role.dept, div: role.div, sub: role.sub },
    isHead, deptHc, deptBase,
    hayTotal: hay.total, grade, level: L,
    accImpact: hay.acc.impact,
    techList,
  });

  const jobSkills =
    techList.slice(0, 4).map((t) => t.name).join(', ') +
    ', and working fluency in the HRIS and core platforms relevant to the unit.';

  const structuralContext =
    `${role.div} → ${role.sub} → ${role.dept}` +
    (isHead ? ` · ${deptHc} HC · ${fmtAED(deptBase)} annual base` : '');

  return {
    key,
    role_type: role.type,
    doc_no: 'JD-' + String((hashStr(key) % 9000) + 1000),
    revision_no: 'R' + revision,
    date: now.toISOString().slice(0, 10),
    job_title: role.label,
    job_grade: grade,
    reports_to: reportsTo,
    division: role.div,
    department: role.dept,
    section: role.sub,
    job_objective: narrative.objective,
    direct_reports: String(directReports),
    total_reports: String(totalReports),
    accountabilities: narrative.accountabilities,
    internal_comms: comms.int,
    external_comms: comms.ext,
    min_qualifications: LEVEL_QUAL[L],
    min_experience: LEVEL_EXP[L],
    job_skills: jobSkills,
    techList,
    behList,
    hay: { kh: hay.kh, ps: hay.ps, acc: hay.acc, total: hay.total, grade, indicative: !!hay.indicative },
    structural_context: structuralContext,
    generated_on: now.toLocaleString('en-GB'),
    generated_by: generatedBy,
  };
}

// Appendix B tag payload for Word merge
export function exportJdData(jd: JobDescription): Record<string, string> {
  const numbered = jd.accountabilities.map((a, i) => `${i + 1}. ${a}`).join('\n');
  return {
    doc_no: jd.doc_no, revision_no: jd.revision_no, date: jd.date,
    job_title: jd.job_title, job_grade: jd.job_grade, reports_to: jd.reports_to,
    division: jd.division, department: jd.department, section: jd.section,
    job_objective: jd.job_objective,
    direct_reports: jd.direct_reports, total_reports: jd.total_reports,
    key_accountabilities: numbered, ai_responsibilities: numbered,
    internal_comms: jd.internal_comms, external_comms: jd.external_comms,
    min_qualifications: jd.min_qualifications, min_experience: jd.min_experience,
    job_skills: jd.job_skills,
    behavioral_competencies: jd.behList.map((b) => `${b.name} — Level ${b.lvl}`).join('\n'),
    technical_competencies: jd.techList.map((t) => `${t.name} (${t.code}) — Level ${t.lvl}`).join('\n'),
    sfia_skills: jd.techList.map((t) => `${t.code} L${t.lvl}`).join(' · '),
    hay_know_how: `${jd.hay.kh.pts} pts — ${jd.hay.kh.note}`,
    hay_problem_solving: `${jd.hay.ps.pts} pts — ${jd.hay.ps.note}`,
    hay_accountability: `${jd.hay.acc.pts} pts — ${jd.hay.acc.note}`,
    hay_score: String(jd.hay.total), hay_total: String(jd.hay.total), hay_grade: jd.hay.grade,
    structural_context: jd.structural_context,
    generated_on: jd.generated_on, generated_by: jd.generated_by,
  };
}
