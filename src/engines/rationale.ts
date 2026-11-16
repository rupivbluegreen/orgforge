import { streamOf } from './streams';
import { fmtAED } from './format';

export const SYNERGY: Record<string, string> = {
  'Front Office & Distribution': 'revenue origination, client coverage and distribution reach',
  'Risk & Control Functions': 'independent oversight, control assurance and regulatory line-of-sight',
  'Technology & Digital': 'platform engineering, data and digital delivery capability',
  Operations: 'processing scale, straight-through efficiency and service resilience',
  'Business Support': 'enterprise enablement and shared-service leverage',
};

export interface RationaleContext {
  entity: string;
  entityType: string;
  hc: number;
  cost: number;
  from: { division: string; subdivision: string };
  to: { division: string; subdivision: string };
  toDivHC: number;
  hayBefore: { total: number; grade: string; kh: { pts: number }; acc: { pts: number } };
  hayAfter: { total: number; grade: string; kh: { pts: number }; acc: { pts: number } };
}

export interface RationaleDraft {
  business_rationale: string;
  fitment_rationale: string;
}

export function draftRationale(ctx: RationaleContext): RationaleDraft {
  const dir = ctx.hayAfter.total > ctx.hayBefore.total ? 'up' : ctx.hayAfter.total < ctx.hayBefore.total ? 'down' : 'flat';
  const toSt = streamOf(ctx.to.subdivision);
  const frSt = streamOf(ctx.from.subdivision);

  const br = [
    `The transfer of ${ctx.entity} (${ctx.hc} FTE, ${fmtAED(ctx.cost)} annual base) from ${ctx.from.division} to ${ctx.to.division} consolidates the unit alongside adjacent capabilities in the ${ctx.to.subdivision} stream, aligning accountability for ${SYNERGY[ctx.to.subdivision] || 'the target capability set'} under a single divisional mandate. The move removes a cross-divisional hand-off from the value chain and positions the receiving division (${ctx.toDivHC} FTE post-move) as the end-to-end owner of the outcome.`,
    dir === 'up'
      ? `Structurally, the receiving context enlarges the role: divisional scale and ${toSt.impactLbl.toLowerCase()} impact on results lift the evaluated weight of the head-of-unit position (${ctx.hayBefore.total} → ${ctx.hayAfter.total} Hay points). This is a deliberate investment in leadership capacity where the operating model concentrates decision rights, and should be read together with the manpower cost KPIs before confirmation.`
      : dir === 'down'
        ? `Structurally, the receiving context narrows the evaluated weight of the head-of-unit position (${ctx.hayBefore.total} → ${ctx.hayAfter.total} Hay points), consistent with a ${toSt.impactLbl.toLowerCase()} impact profile in the new stream. This supports de-layering and cost discipline objectives; incumbent grandfathering and red-circling rules should be applied per policy.`
        : `The evaluated weight of the head-of-unit role is unchanged (${ctx.hayAfter.total} Hay points), indicating the move is capability-driven rather than grade-driven; no re-banding is triggered and the change is cost-neutral at role level.`,
  ].join('\n\n');

  const fr = [
    `Post-move, ${ctx.entity} reports through the ${ctx.to.subdivision} leadership line of ${ctx.to.division}. Know-How requirements ${ctx.hayAfter.kh.pts > ctx.hayBefore.kh.pts ? 'broaden with the wider divisional span' : 'remain anchored in the existing technical depth'} (${ctx.hayBefore.kh.pts} → ${ctx.hayAfter.kh.pts} pts), while Accountability moves from a ${frSt.impactLbl.toLowerCase()} to a ${toSt.impactLbl.toLowerCase()} impact posture (${ctx.hayBefore.acc.pts} → ${ctx.hayAfter.acc.pts} pts).`,
    `Consequential actions have been executed automatically: the job descriptions of every affected position have been regenerated in JD Studio (see tab 03), incumbents should be validated against the ${ctx.hayAfter.grade} band, and the Oracle spine position hierarchy has been updated.`,
  ].join('\n\n');

  return { business_rationale: br, fitment_rationale: fr };
}
