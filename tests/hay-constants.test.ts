import { describe, it, expect } from 'vitest';
import { stepAt, nearestStep, gradeFor, bandMidpoint, levelOf } from '../src/engines/hay-constants';

describe('Hay ladder helpers (PRD §5.1)', () => {
  it('stepAt clamps into the 25-step ladder', () => {
    expect(stepAt(9)).toBe(175);
    expect(stepAt(16)).toBe(460);
    expect(stepAt(-5)).toBe(50);
    expect(stepAt(99)).toBe(1400);
  });

  it('nearestStep rounds to the closest ladder step', () => {
    expect(nearestStep(174.8)).toBe(175);
    expect(nearestStep(140)).toBe(132);
  });

  it('gradeFor maps points to the default grade ladder', () => {
    expect(gradeFor(865)).toBe('M2');
    expect(gradeFor(920)).toBe('M1');
    expect(gradeFor(779)).toBe('M3');
  });

  it('bandMidpoint computes the M2 band midpoint', () => {
    expect(bandMidpoint('M2')).toBe(850);
  });

  it('levelOf reads the organizational level table used by governance drift checks', () => {
    expect(levelOf('E1')).toBe(7);
    expect(levelOf('M1')).toBe(5);
    expect(levelOf('M3')).toBe(6);
    expect(levelOf('C1')).toBe(1);
    expect(levelOf('NOT-A-GRADE')).toBe(0);
  });
});
