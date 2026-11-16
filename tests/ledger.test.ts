import { describe, it, expect } from 'vitest';
import { Ledger } from '../src/engines/ledger';

const NOW = new Date('2026-09-22T14:30:00.000Z');

describe('Ledger (PRD §5.10, §7.3 audit trail)', () => {
  it('logs an entry with timestamp, kind, op and message', () => {
    const ledger = new Ledger();
    const entry = ledger.log('write', 'ORA-WRITE', 'org_change department: Legal → Retail Banking Group', NOW);
    expect(entry).toEqual({
      timestamp: '2026-09-22T14:30:00.000Z',
      kind: 'write',
      op: 'ORA-WRITE',
      message: 'org_change department: Legal → Retail Banking Group',
    });
  });

  it('transactionCount increments on every log call, uncapped', () => {
    const ledger = new Ledger(2);
    ledger.log('read', 'A', 'one', NOW);
    ledger.log('read', 'B', 'two', NOW);
    ledger.log('read', 'C', 'three', NOW);
    expect(ledger.transactionCount).toBe(3);
  });

  it('recent is newest-first and capped at the configured limit', () => {
    const ledger = new Ledger(2);
    ledger.log('calc', 'HAY', 'first', NOW);
    ledger.log('calc', 'HAY', 'second', NOW);
    ledger.log('calc', 'HAY', 'third', NOW);
    expect(ledger.recent.map((e) => e.message)).toEqual(['third', 'second']);
    expect(ledger.recent).toHaveLength(2);
  });

  it('defaults to a 60-entry cap matching the prototype', () => {
    const ledger = new Ledger();
    for (let i = 0; i < 65; i++) ledger.log('ai', 'AI-GEN', `entry ${i}`, NOW);
    expect(ledger.recent).toHaveLength(60);
    expect(ledger.transactionCount).toBe(65);
    expect(ledger.recent[0].message).toBe('entry 64');
  });
});
