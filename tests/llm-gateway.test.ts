import { describe, it, expect, vi } from 'vitest';
import { Ledger } from '../src/engines/ledger';
import { RateLimiter } from '../src/engines/rate-limiter';
import { LlmGateway } from '../src/engines/llm-gateway';
import type { LlmClient, LlmCompletionParams } from '../src/engines/llm-client';

const NOW = new Date('2026-09-22T14:30:00.000Z');

function makeGateway(client: LlmClient, opts?: { maxRequests?: number; redactFields?: string[] }) {
  const ledger = new Ledger();
  const rateLimiter = new RateLimiter({ maxRequests: opts?.maxRequests ?? 10, windowMs: 60000 });
  const gateway = new LlmGateway(client, ledger, rateLimiter, {
    model: 'test-model',
    maxTokens: 1200,
    redactFields: opts?.redactFields ?? [],
  });
  return { gateway, ledger, rateLimiter };
}

describe('LlmGateway', () => {
  it('success: calls the client, logs LLM-CALL, returns llm engine result', async () => {
    const complete = vi.fn(async () => 'Drafted narrative text.');
    const { gateway, ledger } = makeGateway({ complete });

    const result = await gateway.complete({ userId: 'u1', promptKey: 'narrative', context: { grade: 'M2' } }, NOW);

    expect(result).toEqual({ engine: 'llm', text: 'Drafted narrative text.' });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(ledger.recent[0]).toMatchObject({ kind: 'ai', op: 'LLM-CALL' });
    expect(ledger.recent[0].message).toContain('narrative v1 for u1');
  });

  it('rate-limited: never calls the client, returns fallback, logs LLM-RATE-LIMIT', async () => {
    const complete = vi.fn(async () => 'should not be reached');
    const { gateway, ledger } = makeGateway({ complete }, { maxRequests: 0 });

    const result = await gateway.complete({ userId: 'u1', promptKey: 'narrative', context: {} }, NOW);

    expect(result).toEqual({ engine: 'fallback', reason: 'rate_limited' });
    expect(complete).not.toHaveBeenCalled();
    expect(ledger.recent[0]).toMatchObject({ kind: 'ai', op: 'LLM-RATE-LIMIT' });
  });

  it('client throws (network/non-2xx): returns fallback, logs LLM-FALLBACK with the error', async () => {
    const complete = vi.fn(async () => { throw new Error('LLM API 503'); });
    const { gateway, ledger } = makeGateway({ complete });

    const result = await gateway.complete({ userId: 'u1', promptKey: 'idp', context: {} }, NOW);

    expect(result).toEqual({ engine: 'fallback', reason: 'error' });
    expect(ledger.recent[0].message).toContain('LLM API 503');
  });

  it('empty response: returns fallback with empty_response reason', async () => {
    const complete = vi.fn(async () => '');
    const { gateway, ledger } = makeGateway({ complete });

    const result = await gateway.complete({ userId: 'u1', promptKey: 'skills', context: {} }, NOW);

    expect(result).toEqual({ engine: 'fallback', reason: 'empty_response' });
    expect(ledger.recent[0]).toMatchObject({ op: 'LLM-FALLBACK' });
  });

  it('applies redaction before sending the prompt to the client', async () => {
    let seenPrompt = '';
    const complete = vi.fn(async (params: LlmCompletionParams) => {
      seenPrompt = params.userPrompt;
      return 'ok';
    });
    const { gateway } = makeGateway({ complete }, { redactFields: ['nationality'] });

    await gateway.complete(
      { userId: 'u1', promptKey: 'skills', context: { name: 'Mariam', nationality: 'Expat', grade: 'M3' } },
      NOW
    );

    expect(seenPrompt).toContain('Mariam');
    expect(seenPrompt).not.toContain('nationality');
    expect(seenPrompt).not.toContain('Expat');
  });

  it('passes the registry system prompt and configured model/maxTokens through', async () => {
    let seenParams: LlmCompletionParams | null = null;
    const complete = vi.fn(async (params: LlmCompletionParams) => {
      seenParams = params;
      return 'ok';
    });
    const { gateway } = makeGateway({ complete });

    await gateway.complete({ userId: 'u1', promptKey: 'policy', context: {} }, NOW);

    expect(seenParams).not.toBeNull();
    expect(seenParams!.model).toBe('test-model');
    expect(seenParams!.maxTokens).toBe(1200);
    expect(seenParams!.systemPrompt).toContain('Federal Decree-Law 33/2021');
  });
});
