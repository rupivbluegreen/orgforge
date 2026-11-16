import { describe, it, expect } from 'vitest';
import { seedDepartmentPeople } from '../src/engines/person';
import {
  fitPayLine,
  findOutliers,
  gradeBandTable,
  bucketOf,
  equityHeatMap,
  meritTertile,
  projectMerit,
  DEFAULT_MERIT_MATRIX,
} from '../src/engines/rewards';

const NOW = new Date('2026-09-22T00:00:00.000Z');
const [mariam, rohan, huda] = seedDepartmentPeople('Support Functions', 'Risk & Control Functions', 'Legal', 3, 1, NOW);
const people = [mariam, rohan, huda];

describe('fitPayLine / findOutliers', () => {
  it('OLS fit matches the reference exactly for the 3 seeded Legal incumbents', () => {
    const fit = fitPayLine(people);
    expect(fit.slope).toBeCloseTo(411.24625991934437, 6);
    expect(fit.intercept).toBeCloseTo(180642.4266076926, 4);
  });

  it('flags Rohan (P4, +22.3% over the fitted line) as the only outlier', () => {
    const fit = fitPayLine(people);
    const outliers = findOutliers(people, fit);
    expect(outliers).toHaveLength(1);
    expect(outliers[0].person.name).toBe('Rohan Nair');
    expect(outliers[0].deviation).toBeCloseTo(0.22317090776351722, 6);
  });
});

describe('gradeBandTable', () => {
  it('one row per grade, sorted by Hay midpoint, matches the reference', () => {
    const fit = fitPayLine(people);
    const rows = gradeBandTable(people, fit);
    expect(rows.map((r) => r.grade)).toEqual(['C2', 'P4', 'M3']);
    const m3 = rows.find((r) => r.grade === 'M3')!;
    expect(m3.hayMid).toBe(720);
    expect(m3.mid).toBeCloseTo(476739.73374962056, 4);
    expect(m3.incumbents).toBe(1);
  });
});

describe('bucketOf / equityHeatMap', () => {
  it('buckets grades into C / P / M-E by first letter', () => {
    expect(bucketOf('C2')).toBe('C');
    expect(bucketOf('P4')).toBe('P');
    expect(bucketOf('M3')).toBe('M/E');
    expect(bucketOf('E1')).toBe('M/E');
  });

  it('aggregates avg compa-ratio per division × bucket, null for empty cells', () => {
    const records = people.map((person) => ({ person, divisionName: 'Support Functions' }));
    const heat = equityHeatMap(records, ['Support Functions', 'Retail Banking Group']);
    const m3Cell = heat.find((c) => c.divisionName === 'Support Functions' && c.bucket === 'M/E')!;
    expect(m3Cell.avgCompaRatio).toBeCloseTo(0.9736394557823129, 10);
    expect(m3Cell.count).toBe(1);
    const emptyCell = heat.find((c) => c.divisionName === 'Retail Banking Group' && c.bucket === 'C')!;
    expect(emptyCell.avgCompaRatio).toBeNull();
    expect(emptyCell.count).toBe(0);
  });
});

describe('meritTertile / projectMerit', () => {
  it('all 3 seeded Legal incumbents land in the mid CR tertile', () => {
    people.forEach((p) => expect(meritTertile(p)).toBe(1));
  });

  it('projects payroll, increment cost and CTC using the default merit matrix', () => {
    const proj = projectMerit(people, DEFAULT_MERIT_MATRIX);
    expect(proj.currentPayroll).toBe(1441500);
    expect(proj.incrementCost).toBeCloseTo(41185, 0);
    expect(proj.projectedCtc).toBe(1986798);
  });
});
