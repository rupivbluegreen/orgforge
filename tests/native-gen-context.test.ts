import { describe, it, expect } from 'vitest';
import { seedDepartmentPeople } from '../src/engines/person';
import { buildPersonContext } from '../src/engines/native-gen-context';

const NOW = new Date('2026-09-22T00:00:00.000Z');
const [mariam] = seedDepartmentPeople('Support Functions', 'Risk & Control Functions', 'Legal', 3, 1, NOW);

describe('buildPersonContext', () => {
  it('assembles the full context for Mariam (M3, Legal) exactly', () => {
    const ctx = buildPersonContext(mariam, 'Support Functions', 'Risk & Control Functions', 'Legal', NOW);
    expect(ctx).toEqual({
      id: 'EMP-10001', name: 'Mariam Khalifa', job: 'Team Manager', grade: 'M3',
      department: 'Legal', division: 'Support Functions',
      annual_base_AED: 458000, allowances_AED: 160500,
      compa_ratio: 0.97,
      performance_rating: 4, rating_label: 'Exceeds Expectations', dev_plan: 'MGR-4-5',
      plan: expect.objectContaining({ stream: 'Management', trans: '4 → 5' }),
      tenure_years: 5.2, nationality: 'Expat', flight_risk: false,
      sfia_surplus_pts: 1,
      sfia_gaps: [
        { skill: 'AML / sanctions compliance', code: 'AMLC', have: 5, required: 6 },
        { skill: 'Personal data protection', code: 'PEDP', have: 4, required: 5 },
      ],
      eosb_today_AED: 85714,
    });
  });
});
