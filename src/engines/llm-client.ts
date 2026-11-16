// credentials stay server-side
export interface LlmCompletionParams {
  model: string;
  maxTokens: number;
  systemPrompt: string;
  userPrompt: string;
}

export interface LlmClient {
  complete(params: LlmCompletionParams): Promise<string>;
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

// OpenAI-compatible chat completions endpoint
// apiKey: from a vault/env, never client-embedded
export class HttpLlmClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly endpoint: string
  ) {}

  async complete(params: LlmCompletionParams): Promise<string> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM API ${res.status}`);
    const data = (await res.json()) as ChatResponse;
    return (data.choices || []).map((c) => c.message?.content || '').join('\n');
  }
}
