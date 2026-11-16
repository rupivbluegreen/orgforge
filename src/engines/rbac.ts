// PRD §2 personas + the 4 named RBAC dimensions.
export type Persona =
  | 'OrgDesignLead'
  | 'RewardsManager'
  | 'HRBusinessPartner'
  | 'TalentAcquisitionLead'
  | 'ComplianceOfficer'
  | 'CHRO'
  | 'Employee'
  | 'SystemAdministrator';

export type ModuleId = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11';

export interface PersonaDefinition {
  id: Persona;
  description: string;
  primaryModules: ModuleId[];
  keyPermissions: string;
}

export const PERSONAS: Record<Persona, PersonaDefinition> = {
  OrgDesignLead: {
    id: 'OrgDesignLead',
    description: 'Designs target structures, runs what-if scenarios, prepares committee papers',
    primaryModules: ['01', '03', '05', '09'],
    keyPermissions: 'Move entities, save/compare scenarios, propose commit',
  },
  RewardsManager: {
    id: 'RewardsManager',
    description: 'Owns grading governance, pay bands, merit budget, re-banding cases',
    primaryModules: ['06', '03'],
    keyPermissions: 'Approve/reject re-banding cases, edit merit matrix, view all pay data',
  },
  HRBusinessPartner: {
    id: 'HRBusinessPartner',
    description: 'Runs performance cycle, development planning, talent reviews for a division',
    primaryModules: ['10', '08', '02'],
    keyPermissions: 'Rate employees (own scope), assign plans, run 9-box',
  },
  TalentAcquisitionLead: {
    id: 'TalentAcquisitionLead',
    description: 'Consumes regenerated JDs, pushes requisitions to ORC, runs interview kits',
    primaryModules: ['04', '11'],
    keyPermissions: 'Export JDs, push requisitions to ORC, generate interview material',
  },
  ComplianceOfficer: {
    id: 'ComplianceOfficer',
    description: 'Monitors EOSB liability, Emiratization %, restructuring cost & legality',
    primaryModules: ['07'],
    keyPermissions: 'Run restructuring models; execute requires second approval',
  },
  CHRO: {
    id: 'CHRO',
    description: 'Consumes KPI strip, composite sheet, scenario comparisons, AI narratives',
    primaryModules: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'],
    keyPermissions: 'Read-only plus commit approval',
  },
  Employee: {
    id: 'Employee',
    description: 'Uses Policy Assistant and Career Coach chat modes only',
    primaryModules: ['11'],
    keyPermissions: 'Own record only; chat modes policy + career',
  },
  SystemAdministrator: {
    id: 'SystemAdministrator',
    description: 'Uploads reference data, manages engine config and API keys',
    primaryModules: [],
    keyPermissions: 'Reference-data management, engine switching, key management',
  },
};

export const hasModuleAccess = (persona: Persona, moduleId: ModuleId): boolean =>
  PERSONAS[persona].primaryModules.includes(moduleId);

// (a) pay data visibility
export const canViewAllPayData = (persona: Persona): boolean =>
  persona === 'RewardsManager' || persona === 'CHRO';

// (b) rating edit; caller enforces exact scope
export type RatingEditScope = 'none' | 'own_scope';
export const ratingEditScope = (persona: Persona): RatingEditScope =>
  persona === 'HRBusinessPartner' ? 'own_scope' : 'none';

// (c) restructuring: maker-checker
export const canRunRestructuringModel = (persona: Persona): boolean => persona === 'ComplianceOfficer';

export function canExecuteRestructuring(
  runner: { persona: Persona; userId: string },
  approver: { persona: Persona; userId: string }
): boolean {
  if (runner.userId === approver.userId) return false; // no self-approve
  if (!canRunRestructuringModel(runner.persona)) return false;
  return approver.persona === 'ComplianceOfficer' || approver.persona === 'CHRO';
}

// (d) scenario commit: maker-checker.
export const canProposeScenarioCommit = (persona: Persona): boolean => persona === 'OrgDesignLead';
export const canApproveScenarioCommit = (persona: Persona): boolean => persona === 'CHRO';

export function canCommitScenario(
  proposer: { persona: Persona; userId: string },
  approver: { persona: Persona; userId: string }
): boolean {
  if (proposer.userId === approver.userId) return false;
  return canProposeScenarioCommit(proposer.persona) && canApproveScenarioCommit(approver.persona);
}

// PRD §8.4: employee sees own record only.
export function canAccessEmployeeRecord(
  viewer: { persona: Persona; userId: string },
  targetUserId: string
): boolean {
  if (viewer.persona === 'Employee') return viewer.userId === targetUserId;
  return true; // others: governed by module/pay-data checks
}
