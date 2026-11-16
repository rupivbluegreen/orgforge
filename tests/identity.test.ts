import { describe, it, expect } from 'vitest';
import { NoAuthIdentityProvider } from '../src/engines/identity';
import type { AuthenticatedIdentity } from '../src/engines/identity';

describe('NoAuthIdentityProvider (test/local-dev seam, not for production)', () => {
  it('verifyToken always resolves the configured identity regardless of token value', async () => {
    const identity: AuthenticatedIdentity = {
      userId: 'u1', displayName: 'Test User', email: 'test@example.com',
      persona: 'OrgDesignLead', claims: { sub: 'u1' },
    };
    const provider = new NoAuthIdentityProvider(identity);
    expect(await provider.verifyToken('anything')).toEqual(identity);
    expect(await provider.verifyToken('')).toEqual(identity);
  });
});
