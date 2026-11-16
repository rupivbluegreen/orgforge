import { describe, it, expect } from 'vitest';
import { mulberry32, hashStr, makePerson, seedDepartmentPeople } from '../src/engines/person';

const NOW = new Date('2026-09-22T00:00:00.000Z');

describe('mulberry32 / hashStr determinism', () => {
  it('hashStr("Legal") matches the reference FNV-1a hash', () => {
    expect(hashStr('Legal')).toBe(3732222122);
  });

  it('same seed always produces the same stream', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
});

describe('makePerson / seedDepartmentPeople — byte-identical to the reference', () => {
  it('Legal (Risk & Control Functions, Support Functions) 3 incumbents match the reference data exactly', () => {
    const people = seedDepartmentPeople('Support Functions', 'Risk & Control Functions', 'Legal', 3, 1, NOW);

    expect(people).toHaveLength(3);

    expect(people[0]).toEqual({
      id: 'EMP-10001', name: 'Mariam Khalifa', grade: 'M3', job: 'Team Manager',
      skills: { RSKM: 7, GOVN: 6, AMLC: 5, DAAN: 5, AUDT: 5, PEDP: 4 },
      behaviours: { AUTO: 7, INFL: 6, CPLX: 6, COLL: 6, COMM: 6, DECM: 6, ADAP: 6, LDSH: 7 },
      sal: 458000, allow: 160500, startDate: '2021-06-25', nationality: 'Expat', perf: 4,
    });

    expect(people[1]).toEqual({
      id: 'EMP-10002', name: 'Rohan Nair', grade: 'P4', job: 'Treasury Dealer',
      skills: { RSKM: 4, GOVN: 4, AMLC: 4, DAAN: 4, AUDT: 4, PEDP: 3 },
      behaviours: { AUTO: 5, INFL: 5, CPLX: 5, COLL: 4, COMM: 5, DECM: 5, ADAP: 5, LDSH: 5 },
      sal: 394500, allow: 138000, startDate: '2012-11-06', nationality: 'Expat', perf: 3,
    });

    expect(people[2]).toEqual({
      id: 'EMP-10003', name: 'Huda Al Ali', grade: 'C2', job: 'Teller',
      skills: { RSKM: 1, GOVN: 1, AMLC: 2, DAAN: 1, AUDT: 2, PEDP: 1, BPRE: 1 },
      behaviours: { AUTO: 2, INFL: 2, CPLX: 2, COLL: 2, COMM: 1, DECM: 3, ADAP: 2, LDSH: 1 },
      sal: 215000, allow: 75500, startDate: '2025-06-16', nationality: 'Expat', perf: 3,
    });
  });

  it('calling makePerson directly with the same rng stream matches seedDepartmentPeople', () => {
    const rng = mulberry32(hashStr('Legal'));
    const p1 = makePerson(rng, 'Support Functions', 'Risk & Control Functions', 'Legal', 1, NOW);
    expect(p1.name).toBe('Mariam Khalifa');
    expect(p1.sal).toBe(458000);
  });
});
