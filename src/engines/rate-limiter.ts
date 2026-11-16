// PRD §8.6: per-user quota, fixed window
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private windows = new Map<string, { count: number; windowStart: number }>();

  constructor(private readonly config: RateLimitConfig) {}

  checkAndConsume(userId: string, now: Date = new Date()): boolean {
    const t = now.getTime();
    const entry = this.windows.get(userId);
    if (!entry || t - entry.windowStart >= this.config.windowMs) {
      if (this.config.maxRequests < 1) {
        this.windows.set(userId, { count: 0, windowStart: t });
        return false;
      }
      this.windows.set(userId, { count: 1, windowStart: t });
      return true;
    }
    if (entry.count >= this.config.maxRequests) return false;
    entry.count++;
    return true;
  }

  remaining(userId: string, now: Date = new Date()): number {
    const t = now.getTime();
    const entry = this.windows.get(userId);
    if (!entry || t - entry.windowStart >= this.config.windowMs) return this.config.maxRequests;
    return Math.max(0, this.config.maxRequests - entry.count);
  }
}
