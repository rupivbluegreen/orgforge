import type {
  DepartmentMoveInput,
  MoveVerdict,
  OrgModel,
  SubDivisionMoveInput,
  PersonMoveInput,
} from './types';
import { levelOf } from './hay-constants';
import { streamOf, GOVERNANCE_IMPACT_LABEL } from './streams';

export function assessDepartmentMove(mv: DepartmentMoveInput, model: OrgModel): MoveVerdict {
  const reasons: string[] = [];
  let verdict: MoveVerdict['verdict'] = 'VALID';

  const dDiv = model.divisions.find((d) => d.name === mv.to.division);
  const dSub = dDiv?.subdivisions.find((s) => s.name === mv.to.subdivision);
  const span = dSub ? dSub.departments.length : 0;
  if (span > 9) {
    verdict = 'INVALID';
    reasons.push(`Span-of-control breach: ${mv.to.subdivision} now carries ${span} departments (rule ≤9).`);
  }

  if (mv.hayBefore && mv.hayAfter) {
    const gB = mv.hayBefore.grade;
    const gA = mv.hayAfter.grade;
    const drop = levelOf(gB) - levelOf(gA);
    if (drop >= 2) {
      verdict = 'INVALID';
      reasons.push(`Grading rule breach: Head of ${mv.entity} falls ${gB} → ${gA} (${mv.hayBefore.total}→${mv.hayAfter.total} Hay pts) — a ${drop}-grade structural downgrade.`);
    } else if (drop !== 0 && verdict !== 'INVALID') {
      verdict = 'HUMAN';
      reasons.push(`Hay drift ${gB} → ${gA}: re-banding case auto-raised; Rewards Committee decision needed.`);
    } else {
      reasons.push(`Hay stable at ${gA} (${mv.hayAfter.total} pts) — grading intact.`);
    }
  }

  const iF = streamOf(mv.from.subdivision).impact;
  const iT = streamOf(mv.to.subdivision).impact;
  if (iF !== iT && (iF === 'R' || iT === 'R') && verdict !== 'INVALID') {
    verdict = 'HUMAN';
    reasons.push(`Function mix: ${GOVERNANCE_IMPACT_LABEL[iF]} unit moving under ${GOVERNANCE_IMPACT_LABEL[iT]} line — independence/segregation-of-duties review required (control function).`);
  } else if (iF !== iT && verdict === 'VALID') {
    reasons.push(`Cross-stream move (${GOVERNANCE_IMPACT_LABEL[iF]} → ${GOVERNANCE_IMPACT_LABEL[iT]}) — culturally different but structurally sound.`);
  }
  if (span <= 9 && verdict === 'VALID') {
    reasons.push(`Receiving span healthy at ${span} departments.`);
  }

  return { verdict, reasons };
}

export function assessSubdivisionMove(mv: SubDivisionMoveInput, model: OrgModel): MoveVerdict {
  const dDiv = model.divisions.find((d) => d.name === mv.to.division);
  const n = dDiv ? dDiv.subdivisions.length : 0;
  if (n > 6) {
    return {
      verdict: 'INVALID',
      reasons: [`Division span breach: ${mv.to.division} now holds ${n} sub-divisions (rule ≤6).`],
    };
  }
  return {
    verdict: 'VALID',
    reasons: [`Division span OK at ${n} sub-divisions; department Hay scores re-evaluated in the new context.`],
  };
}

// level>=7 = E1 only, narrower than PRD prose
export function assessPersonMove(mv: PersonMoveInput): MoveVerdict {
  const mgrs = mv.toDepartmentPeople.filter((p) => levelOf(p.grade) >= 7).length;
  if (mgrs > 1) {
    return {
      verdict: 'HUMAN',
      reasons: [`Two M1+/E-grade leaders now sit in ${mv.toDepartmentName} — clarify who holds the mandate before confirming.`],
    };
  }
  return {
    verdict: 'VALID',
    reasons: ['Transfer structurally clean; payroll, JD and SFIA baseline follow the person automatically.'],
  };
}
