import { describe, it, expect, vi, afterEach } from 'vitest';
import { RealHrisSpine } from '../src/engines/real-spine';

const CONFIG = { baseUrl: 'https://hris.example.com', bearerToken: 'tok-123' };

describe('RealHrisSpine (mocked fetch — no live HRIS tenant exists)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writeOrgChange POSTs to the org-changes path with auth header and JSON body', async () => {
    let seenUrl = '';
    let seenInit: RequestInit | undefined;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      seenUrl = url;
      seenInit = init;
      return { ok: true, json: async () => ({ status: 'OK', txId: 'ORA-TX-1' }) } as Response;
    }));

    const spine = new RealHrisSpine(CONFIG);
    const result = await spine.writeOrgChange({ entityType: 'department', entity: 'Legal', to: { division: 'Consumer Business Group' }, moveId: 'MV-1' });

    expect(result).toEqual({ status: 'OK', txId: 'ORA-TX-1' });
    expect(seenUrl).toBe('https://hris.example.com/api/hr/orgforge/v1/org-changes');
    expect(seenInit!.method).toBe('POST');
    const headers = seenInit!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-123');
    expect(JSON.parse(seenInit!.body as string)).toEqual({
      entityType: 'department', entity: 'Legal', to: { division: 'Consumer Business Group' }, moveId: 'MV-1',
    });
  });

  it('readEmployeeSkills GETs an id-scoped, URL-encoded path', async () => {
    let seenUrl = '';
    let seenInit: RequestInit | undefined;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      seenUrl = url;
      seenInit = init;
      return { ok: true, json: async () => null } as Response;
    }));

    const spine = new RealHrisSpine(CONFIG);
    await spine.readEmployeeSkills('EMP-10001');

    expect(seenUrl).toBe('https://hris.example.com/api/hr/orgforge/v1/employees/EMP-10001/skills');
    expect(seenInit!.method).toBe('GET');
  });

  it('throws with the path and status on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 }) as Response));
    const spine = new RealHrisSpine(CONFIG);
    await expect(spine.writeHayScore({ job: 'Head of Legal', totalPoints: 810, grade: 'M2' }))
      .rejects.toThrow('/hay-scores failed: 401');
  });

  it('every write method posts to its own sub-path', async () => {
    const seenPaths: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      seenPaths.push(new URL(url).pathname);
      return { ok: true, json: async () => ({ status: 'OK' }) } as Response;
    }));

    const spine = new RealHrisSpine(CONFIG);
    await spine.writeCostRollup({ deltaCTC: -26532 });
    await spine.writeRationale({ moveId: 'MV-1' });
    await spine.writeJobDescription({ doc_no: 'JD-6796', revision_no: 'R1', job_title: 'Head of Legal' });

    expect(seenPaths).toEqual([
      '/api/hr/orgforge/v1/cost-rollups',
      '/api/hr/orgforge/v1/rationales',
      '/api/hr/orgforge/v1/job-descriptions',
    ]);
  });
});
