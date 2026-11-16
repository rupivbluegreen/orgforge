import type { Ledger } from './ledger';
import type { RateLimiter } from './rate-limiter';
import type { LlmClient } from './llm-client';
import { PROMPT_REGISTRY } from './prompt-registry';
import type { PromptKey } from './prompt-registry';
import { redactContext } from './redaction';

export interface GatewayRequest {
  userId: string;
  promptKey: PromptKey;
  context: unknown;
}

export type GatewayResult =
  | { engine: 'llm'; text: string }
  | { engine: 'fallback'; reason: 'rate_limited' | 'empty_response' | 'error' };

export interface LlmGatewayConfig {
  model: string;
  maxTokens: number;
  redactFields: string[];
}

// rate limit, redact, audit, fallback
export class LlmGateway {
  constructor(
    private readonly client: LlmClient,
    private readonly ledger: Ledger,
    private readonly rateLimiter: RateLimiter,
    private readonly config: LlmGatewayConfig
  ) {}

  async complete(req: GatewayRequest, now: Date = new Date()): Promise<GatewayResult> {
    if (!this.rateLimiter.checkAndConsume(req.userId, now)) {
      this.ledger.log('ai', 'LLM-RATE-LIMIT', `${req.userId} rate-limited on ${req.promptKey}`, now);
      return { engine: 'fallback', reason: 'rate_limited' };
    }

    const entry = PROMPT_REGISTRY[req.promptKey];
    const redacted = redactContext(req.context, this.config.redactFields);
    const userPrompt = JSON.stringify(redacted);

    try {
      const text = await this.client.complete({
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        systemPrompt: entry.systemPrompt,
        userPrompt,
      });
      if (!text) {
        this.ledger.log('ai', 'LLM-FALLBACK', `${req.promptKey}: empty response`, now);
        return { engine: 'fallback', reason: 'empty_response' };
      }
      this.ledger.log('ai', 'LLM-CALL', `${req.promptKey} v${entry.version} for ${req.userId}`, now);
      return { engine: 'llm', text };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.ledger.log('ai', 'LLM-FALLBACK', `${req.promptKey}: ${message}`, now);
      return { engine: 'fallback', reason: 'error' };
    }
  }
}
