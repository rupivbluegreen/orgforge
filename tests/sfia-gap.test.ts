import { describe, it, expect } from 'vitest';
import { gapStats, sfiaSurplus, sfiaDeficit } from '../src/engines/sfia-gap';
import type { SfiaPerson } from '../src/engines/sfia-gap';

// Grade M2 Legal required tech profile (verified in sfia-catalogue.test.ts):
// { RSKM: 5, GOVN: 5, AMLC: 5, DAAN: 4, AUDT: 4, PEDP: 4 }
const personA: SfiaPerson = {
  grade: 'M2',
  skills: { RSKM: 5, GOVN: 3, AMLC: 5, DAAN: 4, AUDT: 2, PEDP: 6 },
};

describe('gapStats', () => {
  it('two identical incumbents at Legal: 4/12 skills short, 67% ready', () => {
    const stats = gapStats([personA, personA], 'Support Functions', 'Risk & Control Functions', 'Legal');
    expect(stats.reqCnt).toBe(12);
    expect(stats.short).toBe(4);
    expect(stats.gapPts).toBe(8);
    expect(stats.ready).toBe(67);
  });

  it('empty department is 100% ready (no requirements, no gap)', () => {
    const stats = gapStats([], 'Support Functions', 'Risk & Control Functions', 'Legal');
    expect(stats.reqCnt).toBe(0);
    expect(stats.ready).toBe(100);
  });
});

describe('sfiaSurplus / sfiaDeficit', () => {
  it('sfiaSurplus sums held-over-required across the profile', () => {
    // PEDP: held 6, required 4 -> surplus 2. All others <= required.
    expect(sfiaSurplus(personA, 'Support Functions', 'Risk & Control Functions', 'Legal')).toBe(2);
  });

  it('sfiaDeficit lists per-skill shortfalls sorted by gap size', () => {
    const d = sfiaDeficit(personA, 'Support Functions', 'Risk & Control Functions', 'Legal');
    expect(d.pts).toBe(4);
    expect(d.det).toEqual([
      { c: 'GOVN', g: 2, req: 5, have: 3 },
      { c: 'AUDT', g: 2, req: 4, have: 2 },
    ]);
  });

  it('a fully-qualified person has zero deficit', () => {
    const fullyQualified: SfiaPerson = { grade: 'M2', skills: { RSKM: 5, GOVN: 5, AMLC: 5, DAAN: 4, AUDT: 4, PEDP: 4 } };
    const d = sfiaDeficit(fullyQualified, 'Support Functions', 'Risk & Control Functions', 'Legal');
    expect(d.pts).toBe(0);
    expect(d.det).toEqual([]);
  });
});
