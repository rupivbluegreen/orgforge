import { describe, it, expect } from 'vitest';
import {
  perfLabel, perfTrack, perfStream, perfPlanId,
  computeCalibration, applyRatingChange, PERF_SCALE, PERF_GUIDE,
} from '../src/engines/perf';
import type { PerfRating } from '../src/engines/perf';
import { PERF_PLANS, PERF_MODULES } from '../src/engines/perf-plans';

describe('PERF_SCALE / PERF_GUIDE', () => {
  it('has 5 rating entries with the correct calibration guideline %', () => {
    expect(PERF_SCALE).toHaveLength(5);
    expect(PERF_GUIDE).toEqual({ 1: 5, 2: 15, 3: 50, 4: 22, 5: 8 });
  });
});

describe('perfLabel / perfTrack / perfStream', () => {
  it('labels map to the scale entries', () => {
    expect(perfLabel(1)).toBe('Unsatisfactory');
    expect(perfLabel(5)).toBe('Outstanding');
    expect(perfLabel(3)).toBe('Solid Performer');
  });

  it('track: PIP for 1, Sustain & Stretch for 5, Dev plan N->N+1 otherwise', () => {
    expect(perfTrack(1)).toBe('PIP · 90 days');
    expect(perfTrack(5)).toBe('Sustain & Stretch');
    expect(perfTrack(3)).toBe('Dev plan 3 → 4');
  });

  it('maps grade family letter to a stream name', () => {
    expect(perfStream('C2')).toBe('Operations');
    expect(perfStream('P3')).toBe('Professional');
    expect(perfStream('M1')).toBe('Management');
    expect(perfStream('E1')).toBe('Executive');
  });
});

describe('perfPlanId', () => {
  it('rating 1 always routes to PIP-01, rating 5 to STR-01', () => {
    expect(perfPlanId(1, 'M3')).toBe('PIP-01');
    expect(perfPlanId(5, 'C1')).toBe('STR-01');
  });

  it('ratings 2-4 route to the grade-family transition plan', () => {
    expect(perfPlanId(2, 'C2')).toBe('OPS-2-3');
    expect(perfPlanId(3, 'P3')).toBe('PRO-3-4');
    expect(perfPlanId(4, 'M2')).toBe('MGR-4-5');
    expect(perfPlanId(2, 'E1')).toBe('EXE-2-3');
  });

  it('every non-PIP/STR plan id referenced by perfPlanId exists in PERF_PLANS', () => {
    const families = ['C', 'P', 'M', 'E'];
    families.forEach((f) => {
      ([2, 3, 4] as PerfRating[]).forEach((r) => {
        const id = perfPlanId(r, f + '1');
        expect(PERF_PLANS[id]).toBeDefined();
      });
    });
    expect(PERF_PLANS['PIP-01']).toBeDefined();
    expect(PERF_PLANS['STR-01']).toBeDefined();
  });
});

describe('computeCalibration', () => {
  it('matches a hand-computed 8-person distribution exactly', () => {
    const ratings: PerfRating[] = [1, 2, 2, 3, 3, 3, 4, 5];
    const cal = computeCalibration(ratings);

    expect(cal.countByRating).toEqual({ 1: 1, 2: 2, 3: 3, 4: 1, 5: 1 });
    expect(cal.averageRating).toBeCloseTo(2.875, 10);
    expect(cal.onDevelopmentPlan).toBe(6);
    expect(cal.rows).toEqual([
      { rating: 1, count: 1, pct: 12.5, guidelinePct: 5 },
      { rating: 2, count: 2, pct: 25, guidelinePct: 15 },
      { rating: 3, count: 3, pct: 37.5, guidelinePct: 50 },
      { rating: 4, count: 1, pct: 12.5, guidelinePct: 22 },
      { rating: 5, count: 1, pct: 12.5, guidelinePct: 8 },
    ]);
  });

  it('handles zero ratings without dividing by zero', () => {
    const cal = computeCalibration([]);
    expect(cal.averageRating).toBe(0);
    expect(cal.rows.every((r) => r.pct === 0)).toBe(true);
  });
});

describe('applyRatingChange', () => {
  it('recomputes plan id and track for the new rating', () => {
    expect(applyRatingChange(3, 4, 'M2')).toEqual({
      previousRating: 3, newRating: 4, planId: 'MGR-4-5', track: 'Dev plan 4 → 5',
    });
  });

  it('rating 1 -> PIP, rating 5 -> stretch', () => {
    expect(applyRatingChange(3, 1, 'C2').planId).toBe('PIP-01');
    expect(applyRatingChange(3, 5, 'C2').planId).toBe('STR-01');
  });
});

describe('PERF_MODULES', () => {
  it('has 10 modules with priorities', () => {
    expect(PERF_MODULES).toHaveLength(10);
    expect(PERF_MODULES.every((m) => ['P1', 'P2', 'P3'].includes(m.priority))).toBe(true);
  });
});
