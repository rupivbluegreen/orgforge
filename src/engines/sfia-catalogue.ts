import { GRADE_LEVEL } from './hay-constants';

export interface SfiaSkill {
  code: string;
  name: string;
  cat: string;
}

export interface SfiaBehaviour {
  code: string;
  name: string;
}

const SFIA_SEED: [string, string, string][] = [
  ['STPL', 'Strategic planning', 'Strategy and architecture'],
  ['ARCH', 'Solution architecture', 'Strategy and architecture'],
  ['EMRG', 'Emerging technology monitoring', 'Strategy and architecture'],
  ['INOV', 'Innovation management', 'Strategy and architecture'],
  ['BUSA', 'Business situation analysis', 'Change and transformation'],
  ['REQM', 'Requirements definition and management', 'Change and transformation'],
  ['BPRE', 'Business process improvement', 'Change and transformation'],
  ['CIPM', 'Organisational change management', 'Change and transformation'],
  ['PROG', 'Programming / software development', 'Development and implementation'],
  ['DESN', 'Systems design', 'Development and implementation'],
  ['TEST', 'Testing', 'Development and implementation'],
  ['UNAN', 'User experience analysis', 'Development and implementation'],
  ['HCEV', 'User experience design', 'Development and implementation'],
  ['APIO', 'API design and integration', 'Development and implementation'],
  ['DATM', 'Data management', 'Data and analytics'],
  ['DAAN', 'Data analytics', 'Data and analytics'],
  ['DATS', 'Data science', 'Data and analytics'],
  ['MLNG', 'Machine learning', 'Data and analytics'],
  ['VISL', 'Data visualisation', 'Data and analytics'],
  ['BINT', 'Business intelligence', 'Data and analytics'],
  ['SCTY', 'Information security', 'Security and privacy'],
  ['THIN', 'Threat intelligence', 'Security and privacy'],
  ['PENT', 'Penetration testing', 'Security and privacy'],
  ['ITOP', 'Infrastructure operations', 'Delivery and operation'],
  ['USUP', 'Incident management', 'Delivery and operation'],
  ['SLMO', 'Service level management', 'Delivery and operation'],
  ['QUMG', 'Quality management', 'Delivery and operation'],
  ['RSKM', 'Risk management', 'Governance, risk and compliance'],
  ['GOVN', 'Governance', 'Governance, risk and compliance'],
  ['AUDT', 'Audit', 'Governance, risk and compliance'],
  ['PEDP', 'Personal data protection', 'Governance, risk and compliance'],
  ['FMIT', 'Financial management', 'Finance and management'],
  ['SORC', 'Sourcing', 'Finance and management'],
  ['SUPP', 'Supplier management', 'Finance and management'],
  ['SALE', 'Selling', 'Sales and marketing'],
  ['CEXP', 'Customer experience management', 'Sales and marketing'],
  ['MKTG', 'Marketing', 'Sales and marketing'],
  ['RLMT', 'Stakeholder relationship management', 'Relationships and engagement'],
  ['WFPL', 'Workforce planning', 'People and skills'],
  ['ETDL', 'Learning delivery', 'People and skills'],
  ['PDSV', 'Financial product advisory', 'Finance extension'],
  ['CRSC', 'Credit assessment', 'Finance extension'],
  ['TRDX', 'Treasury dealing & execution', 'Finance extension'],
  ['AMLC', 'AML / sanctions compliance', 'Finance extension'],
  ['PAYP', 'Payments processing', 'Finance extension'],
  ['COLR', 'Collections & recoveries', 'Finance extension'],
  ['SHRA', 'Sharia-compliant product structuring', 'Finance extension'],
];

const BEHAVIOUR_SEED: [string, string][] = [
  ['AUTO', 'Autonomy'],
  ['INFL', 'Influence'],
  ['CPLX', 'Complexity'],
  ['COLL', 'Collaboration'],
  ['COMM', 'Communication'],
  ['DECM', 'Decision-making'],
  ['ADAP', 'Adaptability'],
  ['LDSH', 'Leadership'],
];

export const SFIA: { skills: Record<string, SfiaSkill>; behaviours: Record<string, SfiaBehaviour> } = {
  skills: Object.fromEntries(SFIA_SEED.map(([code, name, cat]) => [code, { code, name, cat }])),
  behaviours: Object.fromEntries(BEHAVIOUR_SEED.map(([code, name]) => [code, { code, name }])),
};

// [skill code, level offset from grade level]
export const FAMILY_PROFILES: Record<string, [string, number][]> = {
  'Front Office & Distribution': [['SALE', 0], ['CEXP', 0], ['RLMT', 0], ['PDSV', -1], ['DAAN', -2], ['AMLC', -2]],
  Operations: [['PAYP', 0], ['USUP', 0], ['BPRE', -1], ['QUMG', -1], ['SLMO', -1], ['DAAN', -2]],
  'Technology & Digital': [['PROG', 0], ['DESN', 0], ['ITOP', -1], ['TEST', -1], ['APIO', -1], ['DAAN', -1]],
  'Risk & Control Functions': [['RSKM', 0], ['GOVN', -1], ['AMLC', 0], ['DAAN', -1], ['AUDT', -1], ['PEDP', -2]],
  'Business Support': [['BUSA', 0], ['BPRE', -1], ['RLMT', -1], ['FMIT', -1], ['STPL', -2], ['DAAN', -2]],
};

export const DEPT_OVERLAY: Record<string, [string, number][]> = {
  'Human Resources': [['WFPL', 0], ['ETDL', -1]],
  'Finance & Accounting': [['FMIT', 0], ['BINT', -1]],
  Legal: [['GOVN', 0], ['PEDP', -1]],
  'Compliance & AML': [['AMLC', 1], ['PEDP', -1]],
  'Internal Audit': [['AUDT', 1], ['GOVN', 0]],
  'Corporate Communications': [['MKTG', 0], ['RLMT', 0]],
  'Procurement & Administration': [['SORC', 0], ['SUPP', 0]],
  'Strategy & Transformation': [['STPL', 0], ['CIPM', 0]],
  'Branch Network': [['PDSV', 0], ['CEXP', 0]],
  'Personal Products': [['PDSV', 0], ['MKTG', -1]],
  'Cards & Payments': [['PAYP', 0], ['PDSV', -1]],
  'Wealth & Priority Services': [['PDSV', 1], ['RLMT', 0]],
  'Islamic Finance (Retail)': [['SHRA', 0], ['PDSV', 0]],
  'Mortgages & Auto Finance': [['CRSC', 0], ['PDSV', 0]],
  'Contact Centre': [['CEXP', 0], ['USUP', -1]],
  'Corporate Coverage': [['RLMT', 1], ['CRSC', -1]],
  'Trade Finance': [['PDSV', 0], ['AMLC', -1]],
  'Cash Management & Transactions': [['PAYP', 0], ['APIO', -2]],
  'Financial Institutions': [['RLMT', 0], ['AMLC', -1]],
  'Project & Structured Finance': [['CRSC', 1], ['FMIT', 0]],
  'SME Services': [['CRSC', 0], ['SALE', 0]],
  'FX & Rates Trading': [['TRDX', 1], ['RSKM', -1]],
  'Money Markets & Liquidity': [['TRDX', 0], ['FMIT', 0]],
  'Investments & ALM': [['FMIT', 1], ['RSKM', 0]],
  'Treasury Sales': [['TRDX', 0], ['SALE', 0]],
  'Derivatives Structuring': [['TRDX', 1], ['DATS', -2]],
  'Credit Risk': [['CRSC', 1], ['DAAN', 0]],
  'Market & Liquidity Risk': [['RSKM', 1], ['DATS', -1]],
  'Operational Risk': [['RSKM', 0], ['BPRE', -1]],
  'Fraud Risk & Investigations': [['THIN', 0], ['DAAN', 0]],
  'Model Risk & Analytics': [['DATS', 0], ['MLNG', -1]],
  'Collections & Recoveries': [['COLR', 1], ['DAAN', -1]],
  'Central Operations': [['BPRE', 0], ['QUMG', 0]],
  'Payments Operations': [['PAYP', 1], ['USUP', 0]],
  'IT Infrastructure & Cloud': [['ITOP', 1], ['SCTY', -1]],
  'Core Platform Applications': [['PROG', 0], ['REQM', 0]],
  'Cyber & Information Security': [['SCTY', 1], ['THIN', 0], ['PENT', -1]],
  'Data & Analytics': [['DATS', 0], ['MLNG', 0], ['VISL', -1]],
  'Digital Channels': [['HCEV', 0], ['CEXP', 0]],
  'Mobile Products': [['HCEV', 0], ['UNAN', -1]],
  'Open Platform & APIs': [['APIO', 1], ['SCTY', -1]],
  'Fintech Partnerships': [['INOV', 0], ['SUPP', -1]],
  'Customer Experience Design': [['UNAN', 0], ['HCEV', 0]],
};

export const DIV_CONTEXT: Record<string, [string, number]> = {
  'Support Functions': ['GOVN', -2],
  'Consumer Business Group': ['CEXP', -2],
  'Corporate & Institutional Services': ['CRSC', -2],
  'Treasury & Global Markets': ['FMIT', -2],
  'Risk Management Group': ['RSKM', -2],
  'Operations & Technology': ['EMRG', -3],
  'Digital & Innovation': ['INOV', -2],
};

export const clampLv = (v: number): number => Math.max(1, Math.min(7, v));

export function requiredTechProfile(
  divName: string,
  subdivisionName: string,
  deptName: string,
  grade: string
): Record<string, number> {
  const L = GRADE_LEVEL[grade] || 3;
  const prof: Record<string, number> = {};
  (FAMILY_PROFILES[subdivisionName] || FAMILY_PROFILES['Business Support']).forEach(([c, o]) => {
    if (SFIA.skills[c]) prof[c] = clampLv(L + o);
  });
  (DEPT_OVERLAY[deptName] || []).forEach(([c, o]) => {
    if (SFIA.skills[c]) prof[c] = Math.max(prof[c] || 0, clampLv(L + o));
  });
  const ctx = DIV_CONTEXT[divName];
  if (ctx && SFIA.skills[ctx[0]]) prof[ctx[0]] = Math.max(prof[ctx[0]] || 0, clampLv(L + ctx[1]));
  return prof;
}

export function requiredBehProfile(subdivisionName: string, grade: string): Record<string, number> {
  const L = GRADE_LEVEL[grade] || 3;
  const p: Record<string, number> = {};
  Object.keys(SFIA.behaviours).forEach((c) => { p[c] = clampLv(L); });
  if (subdivisionName === 'Front Office & Distribution') { p.COMM = clampLv(L + 1); p.INFL = clampLv(L); }
  if (subdivisionName === 'Technology & Digital') { p.CPLX = clampLv(L + 1); p.ADAP = clampLv(L); }
  if (subdivisionName === 'Risk & Control Functions') { p.DECM = clampLv(L + 1); p.AUTO = clampLv(L); }
  if (subdivisionName === 'Operations') { p.COLL = clampLv(L); p.ADAP = clampLv(L); }
  p.LDSH = (GRADE_LEVEL[grade] ?? 0) >= 5 ? clampLv(L + 1) : clampLv(L - 1);
  return p;
}

const TRAIN_COST: Record<string, number> = {
  'Security and privacy': 6000,
  'Data and analytics': 5000,
  'Finance extension': 4500,
  'Strategy and architecture': 5500,
  default: 3500,
};

export const trainCost = (code: string): number => TRAIN_COST[SFIA.skills[code]?.cat ?? ''] ?? TRAIN_COST.default;
