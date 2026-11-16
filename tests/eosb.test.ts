import { describe, it, expect } from 'vitest';
import { seedDepartmentPeople } from '../src/engines/person';
import { gradeMid, compaRatio, tenureYears, eosb, noticePay, flightRisk } from '../src/engines/eosb';
import type { Person } from '../src/engines/person';

const NOW = new Date('2026-09-22T00:00:00.000Z');
const [mariam, rohan, huda] = seedDepartmentPeople('Support Functions', 'Risk & Control Functions', 'Legal', 3, 1, NOW);

describe('EOSB / compa-ratio engine (PRD §5.8, §5.4)', () => {
  it('gradeMid computes the pay-line anchor per grade', () => {
    // M3 -> level 6: (6500 + 6*5200 + 1500) * 12
    expect(gradeMid('M3')).toBe(470400);
  });

  it('tenureYears matches the prototype for all 3 seeded incumbents', () => {
    expect(tenureYears(mariam, NOW)).toBeCloseTo(5.242984257357974, 10);
    expect(tenureYears(rohan, NOW)).toBeCloseTo(13.875427789185489, 10);
    expect(tenureYears(huda, NOW)).toBeCloseTo(1.267624914442163, 10);
  });

  it('compaRatio matches the prototype for all 3 seeded incumbents', () => {
    expect(compaRatio(mariam)).toBeCloseTo(0.9736394557823129, 10);
    expect(compaRatio(rohan)).toBeCloseTo(0.9669117647058824, 10);
    expect(compaRatio(huda)).toBeCloseTo(0.9737318840579711, 10);
  });

  it('eosb matches the prototype exactly (crosses the 5-year tier for Mariam and Rohan)', () => {
    expect(eosb(mariam, NOW)).toBe(85714);
    expect(eosb(rohan, NOW)).toBe(244105);
    expect(eosb(huda, NOW)).toBe(9539); // < 5 yrs tenure, 21-day tier only
  });

  it('noticePay is one month of base salary, rounded', () => {
    expect(noticePay(mariam)).toBe(38167);
    expect(noticePay(rohan)).toBe(32875);
    expect(noticePay(huda)).toBe(17917);
  });
});

describe('flightRisk — underpaid + overqualified (PRD §5.9)', () => {
  const basePerson: Person = {
    id: 'EMP-TEST', name: 'Test Person', grade: 'M2', job: 'Test',
    skills: { RSKM: 5, GOVN: 3, AMLC: 5, DAAN: 4, AUDT: 2, PEDP: 6 },
    behaviours: {}, sal: 380000, allow: 0, startDate: '2020-01-01',
    nationality: 'Expat', perf: 3,
  };

  it('underpaid (compa < 0.97) + surplus >= 2 -> true', () => {
    // gradeMid(M2) = 408000, 380000/408000 = 0.931 < 0.97
    // PEDP surplus vs Legal M2 profile (req 4, held 6) = 2
    expect(compaRatio(basePerson)).toBeLessThan(0.97);
    expect(flightRisk(basePerson, 'Support Functions', 'Risk & Control Functions', 'Legal')).toBe(true);
  });

  it('underpaid but no surplus -> false', () => {
    const noSurplus: Person = { ...basePerson, skills: { RSKM: 5, GOVN: 3, AMLC: 5, DAAN: 4, AUDT: 2, PEDP: 4 } };
    expect(flightRisk(noSurplus, 'Support Functions', 'Risk & Control Functions', 'Legal')).toBe(false);
  });

  it('surplus but well-paid (compa >= 0.97) -> false', () => {
    const wellPaid: Person = { ...basePerson, sal: 405000 };
    expect(compaRatio(wellPaid)).toBeGreaterThanOrEqual(0.97);
    expect(flightRisk(wellPaid, 'Support Functions', 'Risk & Control Functions', 'Legal')).toBe(false);
  });
});
