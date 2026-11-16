import { describe, it, expect } from 'vitest';
import { draftRationale } from '../src/engines/rationale';
import type { RationaleContext } from '../src/engines/rationale';

describe('draftRationale — AC-1 scenario (Legal, control-function independence move)', () => {
  const ctx: RationaleContext = {
    entity: 'Legal', entityType: 'department', hc: 41, cost: 7562000,
    from: { division: 'Support Functions', subdivision: 'Risk & Control Functions' },
    to: { division: 'Retail Banking Group', subdivision: 'Front Office & Distribution' },
    toDivHC: 1280,
    hayBefore: { total: 865, grade: 'M2', kh: { pts: 460 }, acc: { pts: 230 } },
    hayAfter: { total: 900, grade: 'M2', kh: { pts: 460 }, acc: { pts: 264 } },
  };
  const draft = draftRationale(ctx);

  it('business rationale names the entity, target stream synergy, and cites the Hay point shift (grade went up)', () => {
    expect(draft.business_rationale).toContain('The transfer of Legal (41 FTE, AED 7.6M annual base)');
    expect(draft.business_rationale).toContain('revenue origination, client coverage and distribution reach');
    expect(draft.business_rationale).toContain('865 → 900 Hay points');
    expect(draft.business_rationale).toContain('deliberate investment in leadership capacity');
  });

  it('fitment rationale cites the impact-posture change and KH point shift, lower-cased stream labels', () => {
    expect(draft.fitment_rationale).toContain('remote to a prime impact posture (230 → 264 pts)');
    expect(draft.fitment_rationale).toContain('remain anchored in the existing technical depth (460 → 460 pts)');
    expect(draft.fitment_rationale).toContain('validated against the M2 band');
  });
});

describe('draftRationale — flat and down cases', () => {
  const base: Omit<RationaleContext, 'hayBefore' | 'hayAfter'> = {
    entity: 'Finance & Accounting', entityType: 'department', hc: 45, cost: 7639000,
    from: { division: 'Support Functions', subdivision: 'Business Support' },
    to: { division: 'Support Functions', subdivision: 'Business Support' },
    toDivHC: 386,
  };

  it('flat (no Hay change) says the move is capability-driven, no re-banding', () => {
    const draft = draftRationale({ ...base, hayBefore: { total: 500, grade: 'P2', kh: { pts: 200 }, acc: { pts: 100 } }, hayAfter: { total: 500, grade: 'P2', kh: { pts: 200 }, acc: { pts: 100 } } });
    expect(draft.business_rationale).toContain('capability-driven rather than grade-driven');
    expect(draft.business_rationale).toContain('cost-neutral at role level');
  });

  it('down (Hay total drops) supports de-layering framing and grandfathering note', () => {
    const draft = draftRationale({ ...base, hayBefore: { total: 600, grade: 'P1', kh: { pts: 200 }, acc: { pts: 100 } }, hayAfter: { total: 450, grade: 'P2', kh: { pts: 180 }, acc: { pts: 90 } } });
    expect(draft.business_rationale).toContain('de-layering and cost discipline objectives');
    expect(draft.business_rationale).toContain('grandfathering and red-circling rules');
  });
});
