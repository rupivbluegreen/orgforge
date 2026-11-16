import { describe, it, expect } from 'vitest';
import { STREAMS, streamOf } from '../src/engines/streams';

describe('STREAMS classification', () => {
  it('matches the taxonomy exactly for all 5 named streams', () => {
    expect(STREAMS['Front Office & Distribution'].impact).toBe('P');
    expect(STREAMS['Risk & Control Functions'].impact).toBe('R');
    expect(STREAMS['Technology & Digital'].impact).toBe('C');
    expect(STREAMS['Operations'].impact).toBe('C');
    expect(STREAMS['Business Support'].impact).toBe('C');
  });

  it('no stream is left coded with the legacy unreachable "Shared" impact', () => {
    Object.values(STREAMS).forEach((s) => {
      expect(['P', 'C', 'R']).toContain(s.impact);
    });
  });

  it('streamOf falls back to Contributory for an unknown stream name', () => {
    expect(streamOf('Some New Stream').impact).toBe('C');
  });
});
