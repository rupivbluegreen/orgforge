// In-memory ledger. No DOM.
export type LedgerKind = 'read' | 'write' | 'calc' | 'ai';

export interface LedgerEntry {
  timestamp: string;
  kind: LedgerKind;
  op: string;
  message: string;
}

export class Ledger {
  private entries: LedgerEntry[] = [];
  private count = 0;

  constructor(private readonly cap: number = 60) {}

  // now: injected, not Date.now(), for repro
  log(kind: LedgerKind, op: string, message: string, now: Date = new Date()): LedgerEntry {
    this.count++;
    const entry: LedgerEntry = { timestamp: now.toISOString(), kind, op, message };
    this.entries.unshift(entry);
    if (this.entries.length > this.cap) this.entries.length = this.cap;
    return entry;
  }

  get transactionCount(): number {
    return this.count;
  }

  get recent(): readonly LedgerEntry[] {
    return this.entries;
  }
}
