import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpLlmClient } from '../src/engines/llm-client';

describe('HttpLlmClient (mocked fetch — never a live network call in tests)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends model/max_tokens/messages with a bearer header, parses choices', async () => {
    let seenUrl = '';
    let seenInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      seenUrl = url;
      seenInit = init;
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Hello' } }, { message: { content: 'World' } }] }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new HttpLlmClient('sk-test-key', 'https://llm.example.com/v1/chat/completions');
    const text = await client.complete({ model: 'test-model', maxTokens: 1200, systemPrompt: 'sys', userPrompt: 'usr' });

    expect(text).toBe('Hello\nWorld');
    expect(seenUrl).toBe('https://llm.example.com/v1/chat/completions');
    const headers = seenInit!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk-test-key');
    const body = JSON.parse(seenInit!.body as string);
    expect(body).toEqual({
      model: 'test-model', max_tokens: 1200,
      messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'usr' }],
    });
  });

  it('throws on a non-2xx response so the gateway can fall back', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 }) as Response));
    const client = new HttpLlmClient('sk-test-key', 'https://llm.example.com/v1/chat/completions');
    await expect(client.complete({ model: 'm', maxTokens: 1, systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow('503');
  });
});
