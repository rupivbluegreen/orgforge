import { SPINE_BASE_PATH } from './spine';
import type {
  SpineAPI, SpineWriteResult,
  OrgChangePayload, HayScorePayload, CostRollupPayload,
  RationalePayload, JobDescriptionPayload,
} from './spine';

export interface RealSpineConfig {
  baseUrl: string;
  bearerToken: string;
}

// Paths provisional; PRD §14.3 leaves REST open
const PATHS = {
  orgSnapshot: '/org-snapshot',
  orgChanges: '/org-changes',
  hayScores: '/hay-scores',
  costRollups: '/cost-rollups',
  rationales: '/rationales',
  jobDescriptions: '/job-descriptions',
  employeeSkills: (id: string) => `/employees/${encodeURIComponent(id)}/skills`,
};

// PRD §7.1: real ORDS, a Mock drop-in
export class RealOracleSpine implements SpineAPI {
  constructor(private readonly config: RealSpineConfig) {}

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${SPINE_BASE_PATH}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.bearerToken}`,
        ...init.headers,
      },
    });
    if (!res.ok) throw new Error(`Spine ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async readOrgSnapshot(): Promise<null> {
    return this.request<null>(PATHS.orgSnapshot, { method: 'GET' });
  }

  async writeOrgChange(p: OrgChangePayload): Promise<SpineWriteResult> {
    return this.request<SpineWriteResult>(PATHS.orgChanges, { method: 'POST', body: JSON.stringify(p) });
  }

  async writeHayScore(p: HayScorePayload): Promise<SpineWriteResult> {
    return this.request<SpineWriteResult>(PATHS.hayScores, { method: 'POST', body: JSON.stringify(p) });
  }

  async writeCostRollup(p: CostRollupPayload): Promise<SpineWriteResult> {
    return this.request<SpineWriteResult>(PATHS.costRollups, { method: 'POST', body: JSON.stringify(p) });
  }

  async writeRationale(p: RationalePayload): Promise<SpineWriteResult> {
    return this.request<SpineWriteResult>(PATHS.rationales, { method: 'POST', body: JSON.stringify(p) });
  }

  async writeJobDescription(p: JobDescriptionPayload): Promise<SpineWriteResult> {
    return this.request<SpineWriteResult>(PATHS.jobDescriptions, { method: 'POST', body: JSON.stringify(p) });
  }

  async readEmployeeSkills(id: string): Promise<null> {
    return this.request<null>(PATHS.employeeSkills(id), { method: 'GET' });
  }
}
