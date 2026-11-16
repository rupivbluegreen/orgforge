import { describe, it, expect } from 'vitest';
import {
  SFIA,
  requiredTechProfile,
  requiredBehProfile,
  trainCost,
} from '../src/engines/sfia-catalogue';

describe('SFIA catalogue', () => {
  it('seeds 47 skills and 8 behaviours', () => {
    expect(Object.keys(SFIA.skills)).toHaveLength(47);
    expect(Object.keys(SFIA.behaviours)).toHaveLength(8);
  });

  it('Legal (Risk & Control Functions, grade M2) required tech profile', () => {
    const prof = requiredTechProfile('Support Functions', 'Risk & Control Functions', 'Legal', 'M2');
    expect(prof).toEqual({ RSKM: 5, GOVN: 5, AMLC: 5, DAAN: 4, AUDT: 4, PEDP: 4 });
  });

  it('Legal (Risk & Control Functions, grade M2) required behavioural profile', () => {
    const prof = requiredBehProfile('Risk & Control Functions', 'M2');
    expect(prof).toEqual({ AUTO: 5, INFL: 5, CPLX: 5, COLL: 5, COMM: 5, DECM: 6, ADAP: 5, LDSH: 6 });
  });

  it('trainCost looks up by skill category, falls back to default', () => {
    expect(trainCost('SCTY')).toBe(6000); // Security and privacy
    expect(trainCost('DAAN')).toBe(5000); // Data and analytics
    expect(trainCost('NOPE')).toBe(3500); // unknown -> default
  });
});
