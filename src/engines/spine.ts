import type { Ledger } from './ledger';
import { fmtAED } from './format';

// real REST API is a drop-in SpineAPI swap
export const SPINE_BASE_PATH = '/api/hr/orgforge/v1';

export interface OrgChangePayload {
  entityType: string;
  entity: string;
  to: { division: string };
  moveId: string;
}

export interface HayScorePayload {
  job: string;
  totalPoints: number;
  grade: string;
}

export interface CostRollupPayload {
  deltaCTC: number;
}

export interface RationalePayload {
  moveId: string;
}

export interface JobDescriptionPayload {
  doc_no: string;
  revision_no: string;
  job_title: string;
}

// status: provider-specific, never string-matched
export interface SpineWriteResult {
  status: string;
  txId?: string;
}

export interface SpineAPI {
  readOrgSnapshot(): Promise<null>;
  writeOrgChange(p: OrgChangePayload): Promise<SpineWriteResult>;
  writeHayScore(p: HayScorePayload): Promise<SpineWriteResult>;
  writeCostRollup(p: CostRollupPayload): Promise<SpineWriteResult>;
  writeRationale(p: RationalePayload): Promise<SpineWriteResult>;
  writeJobDescription(p: JobDescriptionPayload): Promise<SpineWriteResult>;
  readEmployeeSkills(id: string): Promise<null>;
}

// Mocked: logs to ledger, returns MOCK_OK + txId.
export class MockHrisSpine implements SpineAPI {
  constructor(private readonly ledger: Ledger) {}

  async readOrgSnapshot(): Promise<null> {
    this.ledger.log('read', 'ORA-READ', 'SELECT org_snapshot — mocked (Excel/embedded)');
    return null;
  }

  async writeOrgChange(p: OrgChangePayload): Promise<SpineWriteResult> {
    this.ledger.log('write', 'ORA-WRITE', `org_change ${p.entityType}: ${p.entity} → ${p.to.division}`);
    return { status: 'MOCK_OK', txId: 'TX-' + p.moveId };
  }

  async writeHayScore(p: HayScorePayload): Promise<SpineWriteResult> {
    this.ledger.log('write', 'ORA-WRITE', `hay_score ${p.job}: ${p.totalPoints} pts → ${p.grade}`);
    return { status: 'MOCK_OK' };
  }

  async writeCostRollup(p: CostRollupPayload): Promise<SpineWriteResult> {
    this.ledger.log('write', 'ORA-WRITE', `cost_rollup Δ ${fmtAED(p.deltaCTC)} annual CTC`);
    return { status: 'MOCK_OK' };
  }

  async writeRationale(p: RationalePayload): Promise<SpineWriteResult> {
    this.ledger.log('write', 'ORA-WRITE', `rationale doc stored for move ${p.moveId}`);
    return { status: 'MOCK_OK' };
  }

  async writeJobDescription(p: JobDescriptionPayload): Promise<SpineWriteResult> {
    this.ledger.log('write', 'ORA-WRITE', `job_description ${p.doc_no} rev ${p.revision_no} · ${p.job_title}`);
    return { status: 'MOCK_OK' };
  }

  async readEmployeeSkills(id: string): Promise<null> {
    this.ledger.log('read', 'ORA-READ', `employee_skills ${id}`);
    return null;
  }
}
