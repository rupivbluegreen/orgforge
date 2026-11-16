import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../src/engines/rate-limiter';

const T0 = new Date('2026-09-22T14:30:00.000Z');
const addMs = (d: Date, ms: number) => new Date(d.getTime() + ms);

describe('RateLimiter (PRD §8.6 per-user rate limits/quotas)', () => {
  it('allows up to maxRequests within the window, then blocks', () => {
    const rl = new RateLimiter({ maxRequests: 2, windowMs: 60000 });
    expect(rl.checkAndConsume('u1', T0)).toBe(true);
    expect(rl.checkAndConsume('u1', T0)).toBe(true);
    expect(rl.checkAndConsume('u1', T0)).toBe(false);
  });

  it('resets once the window elapses', () => {
    const rl = new RateLimiter({ maxRequests: 1, windowMs: 60000 });
    expect(rl.checkAndConsume('u1', T0)).toBe(true);
    expect(rl.checkAndConsume('u1', addMs(T0, 30000))).toBe(false);
    expect(rl.checkAndConsume('u1', addMs(T0, 60000))).toBe(true);
  });

  it('tracks each user independently', () => {
    const rl = new RateLimiter({ maxRequests: 1, windowMs: 60000 });
    expect(rl.checkAndConsume('u1', T0)).toBe(true);
    expect(rl.checkAndConsume('u2', T0)).toBe(true);
    expect(rl.checkAndConsume('u1', T0)).toBe(false);
  });

  it('maxRequests: 0 blocks the very first request in a fresh window', () => {
    const rl = new RateLimiter({ maxRequests: 0, windowMs: 60000 });
    expect(rl.checkAndConsume('u1', T0)).toBe(false);
  });

  it('remaining() reports quota left without consuming it', () => {
    const rl = new RateLimiter({ maxRequests: 3, windowMs: 60000 });
    expect(rl.remaining('u1', T0)).toBe(3);
    rl.checkAndConsume('u1', T0);
    expect(rl.remaining('u1', T0)).toBe(2);
    expect(rl.remaining('u1', T0)).toBe(2); // unchanged by a second read
  });
});
