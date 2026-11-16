import { describe, it, expect } from 'vitest';
import { HayEngine } from '../src/engines/hay';

describe('HayEngine.indicative — incumbent (non-head) Hay profile', () => {
  it('P2 in Front Office & Distribution: kh 230, ps 87, acc 200, total 517', () => {
    const hay = HayEngine.indicative('P2', 'Front Office & Distribution');
    expect(hay.kh).toEqual({ pts: 230, note: 'Indicative at grade P2 — SFIA responsibility level 4' });
    expect(hay.ps).toEqual({ pts: 87, note: '38% of KH — Front Office & Distribution thinking environment' });
    expect(hay.acc).toEqual({ pts: 200, note: 'Prime impact on end results' });
    expect(hay.total).toBe(517);
    expect(hay.grade).toBe('P2');
    expect(hay.indicative).toBe(true);
  });
});
