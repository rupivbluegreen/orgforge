import type { Persona } from './rbac';

// SSO seam. No real IdP in this build.
export interface AuthenticatedIdentity {
  userId: string;
  displayName: string;
  email: string;
  persona: Persona;
  // raw IdP claims, kept for audit
  claims: Record<string, unknown>;
}

// impl'd by a real SAML/OIDC integration
export interface IdentityProvider {
  verifyToken(token: string): Promise<AuthenticatedIdentity | null>;
}

// test/local-dev only, never production
export class NoAuthIdentityProvider implements IdentityProvider {
  constructor(private readonly identity: AuthenticatedIdentity) {}

  async verifyToken(_token: string): Promise<AuthenticatedIdentity | null> {
    return this.identity;
  }
}
