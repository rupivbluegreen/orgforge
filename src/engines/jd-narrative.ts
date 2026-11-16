import { streamOf } from './streams';
import { fmtAED } from './format';

export const LEVEL_VERB: Record<number, string> = {
  1: 'Support and accurately execute',
  2: 'Deliver and process',
  3: 'Independently own and resolve',
  4: 'Manage, analyse and improve',
  5: 'Lead and be accountable for',
  6: 'Direct and govern',
  7: 'Shape and set enterprise direction for',
};

export const LEVEL_QUAL: Record<number, string> = {
  1: 'High school diploma; banking foundation certificate preferred.',
  2: "Diploma or Bachelor's degree in Business, Finance or a related field.",
  3: "Bachelor's degree in Business, Finance or a related field.",
  4: "Bachelor's degree in a relevant discipline; professional certification preferred.",
  5: "Bachelor's degree required; Master's degree or professional certification (CFA/FRM/CIPD/PMP as relevant) preferred.",
  6: "Master's degree or equivalent professional qualification in a relevant discipline.",
  7: "Master's degree (MBA or equivalent); recognised executive development.",
};

export const LEVEL_EXP: Record<number, string> = {
  1: '0–2 years of relevant experience.',
  2: '2–4 years of relevant experience in banking or financial services.',
  3: '4–6 years of progressive experience in the functional domain.',
  4: '6–8 years of experience with demonstrated ownership of end-to-end processes.',
  5: '8–12 years of experience including team leadership and cross-functional delivery.',
  6: '12–15 years of experience with sustained leadership of a functional area in banking.',
  7: '15+ years including senior leadership of a division-scale mandate in banking.',
};

export const DIV_GOALS: Record<string, string> = {
  'Support Functions': 'enterprise enablement, governance and shared-service excellence',
  'Retail Banking Group': 'retail customer acquisition, deepening and digital-first distribution',
  'Corporate & Institutional Banking': 'wholesale client coverage, financing and transaction-banking growth',
  'Treasury & Global Markets': 'balance-sheet optimisation, market-making and investment performance',
  'Risk Management Group': 'independent risk oversight and portfolio quality across the enterprise',
  'Operations & Technology': 'resilient, scalable, straight-through operations and technology platforms',
  'Digital Banking & Innovation': 'digital product innovation, ecosystem partnerships and customer experience leadership',
};

export const COMMS: Record<string, { int: string; ext: string }> = {
  'Front Office & Distribution': {
    int: 'Product, Credit, Operations, Compliance, Marketing and Branch/Channel teams',
    ext: 'Customers and prospects, business partners, market counterparties and community stakeholders',
  },
  'Risk & Control Functions': {
    int: 'Business lines, Internal Audit, Legal, Finance and executive risk committees',
    ext: 'Central Bank of the UAE and other regulators, external auditors, rating agencies and law-enforcement liaison',
  },
  'Technology & Digital': {
    int: 'Business product owners, Operations, Information Security, Data and Enterprise Architecture',
    ext: 'Technology vendors, fintech partners, cloud providers and regulatory technology examiners',
  },
  Operations: {
    int: 'Front-office units, Technology, Risk, Finance and customer-service teams',
    ext: 'Correspondent banks, payment networks and schemes, vendors and service providers',
  },
  'Business Support': {
    int: 'All divisions, executive management and functional leadership teams',
    ext: 'Vendors and consultants, government entities, industry bodies and professional networks',
  },
};

export interface JdRole {
  label: string;
  dept: string;
  div: string;
  sub: string;
}

export interface JdTechSkill {
  code: string;
  name: string;
  lvl: number;
}

export interface JdNarrativeInput {
  role: JdRole;
  isHead: boolean;
  deptHc: number;
  deptBase: number;
  hayTotal: number;
  grade: string;
  level: number;
  // unset for non-head: prime-line never fires
  accImpact?: 'P' | 'C' | 'R';
  techList: JdTechSkill[];
}

export interface JdNarrative {
  objective: string;
  accountabilities: string[];
}

export function draftJdNarrative(input: JdNarrativeInput): JdNarrative {
  const { role, isHead, deptHc, deptBase, hayTotal, grade, level: L, accImpact, techList } = input;
  const goals = DIV_GOALS[role.div] || 'the division mandate';
  const st = streamOf(role.sub);

  const objective = isHead
    ? `Lead the ${role.dept} unit (${deptHc} FTE) within the ${role.sub} stream of ${role.div}, holding end-to-end accountability for its operating plan, people, controls and cost base (${fmtAED(deptBase)} annual base), so that the unit delivers measurably against the division's agenda of ${goals}. The role carries ${st.impactLbl.toLowerCase()} impact on end results and is evaluated at ${hayTotal} Hay points (${grade}).`
    : `${LEVEL_VERB[L]} the ${role.label.toLowerCase()} agenda within ${role.dept} (${role.sub}, ${role.div}), applying SFIA level-${L} proficiency in ${techList[0]?.name.toLowerCase() || 'the core discipline'} to advance the division's objective of ${goals}, within the bank's risk appetite, Sharia/regulatory requirements where applicable, and service standards.`;

  const acc: string[] = [];
  if (isHead) {
    acc.push(`Own the ${role.dept} annual operating plan and budget; deliver committed volume, quality, cost and control outcomes and report performance to ${role.sub} leadership.`);
    acc.push(`Organise, resource and develop a team of ${deptHc} FTE — workforce plans, succession depth, Emiratization commitments and capability uplift against the unit's SFIA profile.`);
  }
  techList.slice(0, isHead ? 4 : 5).forEach((t) => {
    acc.push(`${LEVEL_VERB[Math.min(7, t.lvl)]} ${t.name.toLowerCase()} (SFIA ${t.code}, level ${t.lvl}) for the unit's processes, products and stakeholders.`);
  });
  acc.push(
    role.sub === 'Risk & Control Functions'
      ? `Maintain an effective control environment: policies, RCSAs, regulatory obligations and audit-issue closure, escalating breaches without delay.`
      : `Operate within the bank's control framework — first-line risk ownership, RCSA participation, timely closure of audit and compliance actions.`
  );
  acc.push(`Keep position, transaction and employee data current in Oracle Fusion (the system of record); adopt approved AI-assisted workflows and contribute improvement ideas through the continuous-improvement channel.`);
  if (accImpact === 'P') {
    acc.push(`Carry prime accountability for the unit's financial results, with direct influence on revenue and client outcomes in the ${role.div} P&L.`);
  }

  return { objective, accountabilities: acc };
}
