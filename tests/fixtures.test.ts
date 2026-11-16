import { describe, it, expect } from 'vitest';
import dataset from '../fixtures/embedded-dataset.json';

describe('embedded dataset fixture (PRD Appendix C)', () => {
  it('has 43 departments', () => {
    expect(dataset).toHaveLength(43);
  });

  it('first row matches the prototype source exactly (Human Resources)', () => {
    expect(dataset[0]).toEqual({
      division: 'Support Functions',
      subdivision: 'Business Support',
      department: 'Human Resources',
      hc: 47,
      base: 10034000,
    });
  });

  it('totals match the prototype\'s actual shipped numbers (not the PRD Appendix C prose, which is stale on headcount)', () => {
    const hc = dataset.reduce((a: number, r: any) => a + r.hc, 0);
    const base = dataset.reduce((a: number, r: any) => a + r.base, 0);
    expect(hc).toBe(4200);
    expect(base).toBe(689744000);
  });
});
