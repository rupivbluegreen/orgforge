import { describe, it, expect } from 'vitest';
import {
  PERSONAS,
  hasModuleAccess,
  canViewAllPayData,
  ratingEditScope,
  canRunRestructuringModel,
  canExecuteRestructuring,
  canProposeScenarioCommit,
  canApproveScenarioCommit,
  canCommitScenario,
  canAccessEmployeeRecord,
} from '../src/engines/rbac';

describe('PERSONAS', () => {
  it('defines all 8 personas with a module list and permissions text', () => {
    expect(Object.keys(PERSONAS)).toHaveLength(8);
    expect(PERSONAS.RewardsManager.primaryModules).toEqual(['06', '03']);
  });
});

describe('hasModuleAccess', () => {
  it('Talent Acquisition Lead has access to 04 and 11, not 06', () => {
    expect(hasModuleAccess('TalentAcquisitionLead', '04')).toBe(true);
    expect(hasModuleAccess('TalentAcquisitionLead', '11')).toBe(true);
    expect(hasModuleAccess('TalentAcquisitionLead', '06')).toBe(false);
  });

  it('CHRO has read access to every module', () => {
    (['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'] as const).forEach((m) =>
      expect(hasModuleAccess('CHRO', m)).toBe(true)
    );
  });

  it('System Administrator has no numbered-module access (header/engine controls only)', () => {
    expect(hasModuleAccess('SystemAdministrator', '01')).toBe(false);
  });
});

describe('(a) pay data visibility', () => {
  it('only Rewards Manager and CHRO view all pay data', () => {
    expect(canViewAllPayData('RewardsManager')).toBe(true);
    expect(canViewAllPayData('CHRO')).toBe(true);
    expect(canViewAllPayData('HRBusinessPartner')).toBe(false);
    expect(canViewAllPayData('Employee')).toBe(false);
  });
});

describe('(b) rating edit rights', () => {
  it('only HR Business Partner gets own_scope rating edit rights', () => {
    expect(ratingEditScope('HRBusinessPartner')).toBe('own_scope');
    expect(ratingEditScope('CHRO')).toBe('none');
    expect(ratingEditScope('OrgDesignLead')).toBe('none');
  });
});

describe('(c) restructuring execution — maker-checker', () => {
  it('only Compliance Officer can run the model', () => {
    expect(canRunRestructuringModel('ComplianceOfficer')).toBe(true);
    expect(canRunRestructuringModel('CHRO')).toBe(false);
  });

  it('execute requires a different-user second approval from Compliance or CHRO', () => {
    const runner = { persona: 'ComplianceOfficer' as const, userId: 'u1' };
    expect(canExecuteRestructuring(runner, { persona: 'CHRO', userId: 'u2' })).toBe(true);
    expect(canExecuteRestructuring(runner, { persona: 'ComplianceOfficer', userId: 'u2' })).toBe(true);
  });

  it('rejects self-approval even by an otherwise-eligible approver', () => {
    const runner = { persona: 'ComplianceOfficer' as const, userId: 'u1' };
    expect(canExecuteRestructuring(runner, { persona: 'CHRO', userId: 'u1' })).toBe(false);
  });

  it('rejects execution when the runner was never eligible to run it', () => {
    const runner = { persona: 'OrgDesignLead' as const, userId: 'u1' };
    expect(canExecuteRestructuring(runner, { persona: 'CHRO', userId: 'u2' })).toBe(false);
  });

  it('rejects an approver outside Compliance/CHRO', () => {
    const runner = { persona: 'ComplianceOfficer' as const, userId: 'u1' };
    expect(canExecuteRestructuring(runner, { persona: 'RewardsManager', userId: 'u2' })).toBe(false);
  });
});

describe('(d) scenario commit — maker-checker', () => {
  it('Org Design Lead proposes, CHRO approves', () => {
    expect(canProposeScenarioCommit('OrgDesignLead')).toBe(true);
    expect(canApproveScenarioCommit('CHRO')).toBe(true);
    expect(canProposeScenarioCommit('CHRO')).toBe(false);
  });

  it('commit succeeds only with distinct proposer/approver and correct personas', () => {
    expect(canCommitScenario({ persona: 'OrgDesignLead', userId: 'u1' }, { persona: 'CHRO', userId: 'u2' })).toBe(true);
    expect(canCommitScenario({ persona: 'OrgDesignLead', userId: 'u1' }, { persona: 'CHRO', userId: 'u1' })).toBe(false);
    expect(canCommitScenario({ persona: 'RewardsManager', userId: 'u1' }, { persona: 'CHRO', userId: 'u2' })).toBe(false);
  });
});

describe('canAccessEmployeeRecord', () => {
  it('Employee persona can only access their own record', () => {
    expect(canAccessEmployeeRecord({ persona: 'Employee', userId: 'e1' }, 'e1')).toBe(true);
    expect(canAccessEmployeeRecord({ persona: 'Employee', userId: 'e1' }, 'e2')).toBe(false);
  });

  it('other personas are not blocked by this check (governed elsewhere)', () => {
    expect(canAccessEmployeeRecord({ persona: 'HRBusinessPartner', userId: 'hr1' }, 'e2')).toBe(true);
  });
});
