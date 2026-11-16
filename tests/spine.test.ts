import { describe, it, expect } from 'vitest';
import { Ledger } from '../src/engines/ledger';
import { MockHrisSpine, SPINE_BASE_PATH } from '../src/engines/spine';

describe('MockHrisSpine', () => {
  it('exposes the API base path from the spec', () => {
    expect(SPINE_BASE_PATH).toBe('/api/hr/orgforge/v1');
  });

  it('readOrgSnapshot logs a read and returns null (mocked, falls back to Excel/embedded)', async () => {
    const ledger = new Ledger();
    const spine = new MockHrisSpine(ledger);
    const result = await spine.readOrgSnapshot();
    expect(result).toBeNull();
    expect(ledger.recent[0]).toMatchObject({ kind: 'read', op: 'ORA-READ', message: 'SELECT org_snapshot — mocked (Excel/embedded)' });
  });

  it('writeOrgChange logs the move and returns a MOCK_OK transaction id', async () => {
    const ledger = new Ledger();
    const spine = new MockHrisSpine(ledger);
    const result = await spine.writeOrgChange({ entityType: 'department', entity: 'Legal', to: { division: 'Consumer Business Group' }, moveId: 'MV-1' });
    expect(result).toEqual({ status: 'MOCK_OK', txId: 'TX-MV-1' });
    expect(ledger.recent[0].message).toBe('org_change department: Legal → Consumer Business Group');
  });

  it('writeHayScore logs job/points/grade', async () => {
    const ledger = new Ledger();
    const spine = new MockHrisSpine(ledger);
    await spine.writeHayScore({ job: 'Head of Legal', totalPoints: 810, grade: 'M2' });
    expect(ledger.recent[0].message).toBe('hay_score Head of Legal: 810 pts → M2');
  });

  it('writeCostRollup formats the delta with fmtAED (negative delta shown with minus sign)', async () => {
    const ledger = new Ledger();
    const spine = new MockHrisSpine(ledger);
    await spine.writeCostRollup({ deltaCTC: -26532 });
    expect(ledger.recent[0].message).toBe('cost_rollup Δ −AED 27K annual CTC');
  });

  it('writeRationale logs the moveId', async () => {
    const ledger = new Ledger();
    const spine = new MockHrisSpine(ledger);
    await spine.writeRationale({ moveId: 'MV-1' });
    expect(ledger.recent[0].message).toBe('rationale doc stored for move MV-1');
  });

  it('writeJobDescription logs doc_no/revision/title (matches jd-document.ts output)', async () => {
    const ledger = new Ledger();
    const spine = new MockHrisSpine(ledger);
    await spine.writeJobDescription({ doc_no: 'JD-6796', revision_no: 'R1', job_title: 'Head of Legal' });
    expect(ledger.recent[0].message).toBe('job_description JD-6796 rev R1 · Head of Legal');
  });

  it('readEmployeeSkills logs the id and returns null', async () => {
    const ledger = new Ledger();
    const spine = new MockHrisSpine(ledger);
    const result = await spine.readEmployeeSkills('EMP-10001');
    expect(result).toBeNull();
    expect(ledger.recent[0].message).toBe('employee_skills EMP-10001');
  });

  it('every write appends to the same ledger the spine was constructed with', async () => {
    const ledger = new Ledger();
    const spine = new MockHrisSpine(ledger);
    await spine.writeOrgChange({ entityType: 'department', entity: 'Legal', to: { division: 'Consumer Business Group' }, moveId: 'MV-1' });
    await spine.writeHayScore({ job: 'Head of Legal', totalPoints: 810, grade: 'M2' });
    await spine.writeCostRollup({ deltaCTC: -26532 });
    expect(ledger.transactionCount).toBe(3);
    expect(ledger.recent).toHaveLength(3);
  });
});
