import { describe, it, expect } from 'vitest';
import { redactContext } from '../src/engines/redaction';

describe('redactContext (PRD §8.5 data minimization)', () => {
  it('strips named fields at the top level', () => {
    const ctx = { name: 'Mariam Khalifa', grade: 'M3', sal: 458000 };
    expect(redactContext(ctx, ['name'])).toEqual({ grade: 'M3', sal: 458000 });
  });

  it('strips named fields recursively, including inside arrays', () => {
    const ctx = {
      department: 'Legal',
      people: [
        { name: 'Mariam', nationality: 'Expat', grade: 'M3' },
        { name: 'Rohan', nationality: 'Expat', grade: 'P4' },
      ],
    };
    expect(redactContext(ctx, ['name', 'nationality'])).toEqual({
      department: 'Legal',
      people: [{ grade: 'M3' }, { grade: 'P4' }],
    });
  });

  it('with no fields configured, returns an equivalent (unredacted) structure', () => {
    const ctx = { name: 'Mariam', grade: 'M3' };
    expect(redactContext(ctx, [])).toEqual(ctx);
  });

  it('leaves primitives and null untouched', () => {
    expect(redactContext(42, ['name'])).toBe(42);
    expect(redactContext(null, ['name'])).toBeNull();
  });
});
