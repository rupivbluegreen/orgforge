export interface StreamProfile {
  psEnv: string;
  impact: 'P' | 'C' | 'R';
  impactLbl: string;
  psBase: number;
}

/**
 * Fixed per PRD §5.2 P/C/R taxonomy.
 * Build 6 shipped 'S' (Shared) for these two
 * streams, which never matched governance's
 * R check (AC-1 bug) and skipped Hay's ACC
 * impact adjustment. See
 * docs/streams-fix-impact-report.md.
 */
export const STREAMS: Record<string, StreamProfile> = {
  'Front Office & Distribution': { psEnv: 'E', impact: 'P', impactLbl: 'Prime', psBase: 0.38 },
  'Risk & Control Functions': { psEnv: 'E', impact: 'R', impactLbl: 'Remote', psBase: 0.38 },
  'Technology & Digital': { psEnv: 'E', impact: 'C', impactLbl: 'Contributory', psBase: 0.38 },
  Operations: { psEnv: 'D', impact: 'C', impactLbl: 'Contributory', psBase: 0.33 },
  'Business Support': { psEnv: 'D', impact: 'C', impactLbl: 'Contributory', psBase: 0.33 },
};

export const streamOf = (name: string): StreamProfile =>
  STREAMS[name] ?? { psEnv: 'D', impact: 'C', impactLbl: 'Contributory', psBase: 0.33 };

export const GOVERNANCE_IMPACT_LABEL: Record<'P' | 'C' | 'R', string> = {
  P: 'Prime (revenue)',
  C: 'Contributory (support)',
  R: 'Remote (control/assurance)',
};
