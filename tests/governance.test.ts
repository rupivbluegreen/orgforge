import { describe, it, expect } from 'vitest';
import { assessDepartmentMove } from '../src/engines/governance';
import type { OrgModel, DepartmentMoveInput } from '../src/engines/types';

function modelWithSpan(subdivisionName: string, divisionName: string, count: number): OrgModel {
  return {
    divisions: [{
      name: divisionName,
      subdivisions: [{
        name: subdivisionName,
        departments: Array.from({ length: count }, (_, i) => ({
          department: `Dept ${i}`, hc: 100, base: 10_000_000,
          _division: divisionName, _subdivision: subdivisionName,
        })),
      }],
    }],
  };
}

describe('assessDepartmentMove — department rules', () => {
  it('Legal (Risk & Control Functions) into Front Office & Distribution → HUMAN, cites control-function independence, no "undefined" text', () => {
    const model = modelWithSpan('Front Office & Distribution', 'Retail Banking Group', 6);
    const mv: DepartmentMoveInput = {
      entityType: 'department', entity: 'Legal',
      from: { division: 'Support Functions', subdivision: 'Risk & Control Functions' },
      to: { division: 'Retail Banking Group', subdivision: 'Front Office & Distribution' },
      hayBefore: { total: 865, grade: 'M2' }, hayAfter: { total: 865, grade: 'M2' },
    };
    const out = assessDepartmentMove(mv, model);
    expect(out.verdict).toBe('HUMAN');
    expect(out.reasons.some((r) => r.includes('independence'))).toBe(true);
    expect(out.reasons.join(' ')).not.toContain('undefined');
  });

  it('receiving sub-division already at 10 departments → INVALID span-of-control breach', () => {
    const model = modelWithSpan('Operations', 'Operations & Technology', 10);
    const mv: DepartmentMoveInput = {
      entityType: 'department', entity: 'Central Operations',
      from: { division: 'Operations & Technology', subdivision: 'Operations' },
      to: { division: 'Operations & Technology', subdivision: 'Operations' },
    };
    const out = assessDepartmentMove(mv, model);
    expect(out.verdict).toBe('INVALID');
    expect(out.reasons.some((r) => r.includes('Span-of-control breach'))).toBe(true);
  });

  it('one-grade Hay drift (M3→P4) → HUMAN, re-banding language', () => {
    const model = modelWithSpan('Business Support', 'Support Functions', 5);
    const mv: DepartmentMoveInput = {
      entityType: 'department', entity: 'Strategy & Transformation',
      from: { division: 'Support Functions', subdivision: 'Business Support' },
      to: { division: 'Support Functions', subdivision: 'Business Support' },
      hayBefore: { total: 665, grade: 'M3' }, hayAfter: { total: 590, grade: 'P4' },
    };
    const out = assessDepartmentMove(mv, model);
    expect(out.verdict).toBe('HUMAN');
    expect(out.reasons.some((r) => r.includes('re-banding case auto-raised'))).toBe(true);
  });

  it('structural downgrade of ≥2 grades (P2→C1) → INVALID', () => {
    const model = modelWithSpan('Business Support', 'Support Functions', 5);
    const mv: DepartmentMoveInput = {
      entityType: 'department', entity: 'Finance & Accounting',
      from: { division: 'Support Functions', subdivision: 'Business Support' },
      to: { division: 'Support Functions', subdivision: 'Business Support' },
      hayBefore: { total: 470, grade: 'P2' }, hayAfter: { total: 235, grade: 'C1' },
    };
    const out = assessDepartmentMove(mv, model);
    expect(out.verdict).toBe('INVALID');
    expect(out.reasons.some((r) => r.includes('structural downgrade'))).toBe(true);
  });

  it('clean cross-stream move between two non-R streams stays VALID with readable label text', () => {
    const model = modelWithSpan('Front Office & Distribution', 'Retail Banking Group', 6);
    const mv: DepartmentMoveInput = {
      entityType: 'department', entity: 'Strategy & Transformation',
      from: { division: 'Support Functions', subdivision: 'Business Support' },
      to: { division: 'Retail Banking Group', subdivision: 'Front Office & Distribution' },
      hayBefore: { total: 460, grade: 'P2' }, hayAfter: { total: 460, grade: 'P2' },
    };
    const out = assessDepartmentMove(mv, model);
    expect(out.verdict).toBe('VALID');
    expect(out.reasons.some((r) => r.includes('Cross-stream move (Contributory (support) → Prime (revenue))'))).toBe(true);
  });
});
