import { describe, it, expect } from 'vitest';
import { assessSubdivisionMove, assessPersonMove } from '../src/engines/governance';
import type { OrgModel, SubDivisionMoveInput, PersonMoveInput } from '../src/engines/types';

function modelWithSubdivisionCount(divisionName: string, count: number): OrgModel {
  return {
    divisions: [{
      name: divisionName,
      subdivisions: Array.from({ length: count }, (_, i) => ({
        name: `Sub ${i}`,
        departments: [],
      })),
    }],
  };
}

describe('assessSubdivisionMove — division span rule', () => {
  it('division already at 7 sub-divisions → INVALID division span breach', () => {
    const model = modelWithSubdivisionCount('Support Functions', 7);
    const mv: SubDivisionMoveInput = { entityType: 'subdivision', to: { division: 'Support Functions' } };
    const out = assessSubdivisionMove(mv, model);
    expect(out.verdict).toBe('INVALID');
    expect(out.reasons.some((r) => r.includes('Division span breach'))).toBe(true);
  });

  it('division at 5 sub-divisions (≤6) → VALID, span OK', () => {
    const model = modelWithSubdivisionCount('Support Functions', 5);
    const mv: SubDivisionMoveInput = { entityType: 'subdivision', to: { division: 'Support Functions' } };
    const out = assessSubdivisionMove(mv, model);
    expect(out.verdict).toBe('VALID');
    expect(out.reasons.some((r) => r.includes('Division span OK'))).toBe(true);
  });
});

describe('assessPersonMove — dual-leadership rule', () => {
  // Ported as originally shipped: the code checks levelOf(grade) >= 7,
  // which (per GRADE_LEVEL) only E1 satisfies — narrower than the written
  // rule ("two M1+/E-grade leaders"). Prototype governs
  // behaviour for Phase 1, so this is ported as-is, not "corrected".
  it('two E1s land in the same department → HUMAN, dual-leadership clash', () => {
    const mv: PersonMoveInput = {
      entityType: 'person',
      toDepartmentName: 'Executive Office',
      toDepartmentPeople: [{ grade: 'E1' }, { grade: 'E1' }, { grade: 'C3' }],
    };
    const out = assessPersonMove(mv);
    expect(out.verdict).toBe('HUMAN');
    expect(out.reasons.some((r) => r.includes('clarify who holds the mandate'))).toBe(true);
  });

  it('one M1 and one E1 in the same department stays VALID', () => {
    const mv: PersonMoveInput = {
      entityType: 'person',
      toDepartmentName: 'Treasury Sales',
      toDepartmentPeople: [{ grade: 'M1' }, { grade: 'E1' }, { grade: 'C2' }],
    };
    const out = assessPersonMove(mv);
    expect(out.verdict).toBe('VALID');
  });

  it('clean transfer with no leadership clash → VALID, structurally clean message', () => {
    const mv: PersonMoveInput = {
      entityType: 'person',
      toDepartmentName: 'Contact Centre',
      toDepartmentPeople: [{ grade: 'C2' }, { grade: 'C3' }],
    };
    const out = assessPersonMove(mv);
    expect(out.verdict).toBe('VALID');
    expect(out.reasons.some((r) => r.includes('Transfer structurally clean'))).toBe(true);
  });
});
