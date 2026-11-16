import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

describe('legacy fixture (Build 6\'s shipped, pre-fix behaviour)', () => {
  it('reproduces the shipped Legal Hay total/grade/CTC exactly', () => {
    execSync('node scripts/legacy-hay-cost.mjs', { stdio: 'pipe' });
    const rows = JSON.parse(readFileSync('fixtures/legacy-hay-cost.json', 'utf8'));
    const legal = rows.find((r: any) => r.department === 'Legal');
    expect(legal.hay.total).toBe(865);
    expect(legal.hay.grade).toBe('M2');
    expect(legal.ctc).toBe(11161396);
  });

  it('covers all 43 departments', () => {
    const rows = JSON.parse(readFileSync('fixtures/legacy-hay-cost.json', 'utf8'));
    expect(rows).toHaveLength(43);
  });
});
