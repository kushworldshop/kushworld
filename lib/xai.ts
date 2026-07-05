const XAI_BASE_URL = 'https://api.x.ai/v1';

export function isXaiConfigured(): boolean {
  return !!process.env.XAI_API_KEY?.trim();
}

export function getXaiVisionModel(): string {
  return process.env.XAI_VISION_MODEL?.trim() || 'grok-4.20-0309-non-reasoning';
}

export function getXaiChatModel(): string {
  return process.env.XAI_CHAT_MODEL?.trim() || 'grok-4.20-0309-non-reasoning';
}

/** Model for agentic web/X search (Responses API with built-in tools). */
export function getXaiResearchModel(): string {
  return process.env.XAI_RESEARCH_MODEL?.trim() || 'grok-4.3';
}

type XaiResponseOutputItem = {
  type?: string;
  role?: string;
  content?: Array<{ type?: string; text?: string }>;
};

function extractResponsesOutputText(data: { output?: XaiResponseOutputItem[] }): string {
  const parts: string[] = [];
  for (const item of data.output ?? []) {
    if (item.type !== 'message') continue;
    for (const block of item.content ?? []) {
      if (block.type === 'output_text' && block.text?.trim()) {
        parts.push(block.text.trim());
      }
    }
  }
  return parts.join('\n').trim();
}

/** Agentic completion with xAI built-in tools (web_search, x_search, etc.). */
export async function xaiResponsesWithTools(options: {
  input: string;
  systemPrompt?: string;
  tools?: Array<Record<string, unknown>>;
  model?: string;
  max_output_tokens?: number;
  timeoutMs?: number;
}): Promise<{ text: string; citations: string[] } | null> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return null;

  const inputMessages: Array<{ role: string; content: string }> = [];
  if (options.systemPrompt?.trim()) {
    inputMessages.push({ role: 'system', content: options.systemPrompt.trim() });
  }
  inputMessages.push({ role: 'user', content: options.input });

  const tools = options.tools ?? [{ type: 'web_search' }, { type: 'x_search' }];
  const timeoutMs = options.timeoutMs ?? 120_000;

  try {
    const res = await fetch(`${XAI_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model ?? getXaiResearchModel(),
        input: inputMessages,
        tools,
        include: ['no_inline_citations'],
        max_output_tokens: options.max_output_tokens ?? 2200,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('xAI responses error:', errBody);
      return null;
    }

    const data = (await res.json()) as {
      output?: XaiResponseOutputItem[];
      citations?: string[];
    };

    const text = extractResponsesOutputText(data);
    if (!text) return null;

    return {
      text,
      citations: Array.isArray(data.citations) ? data.citations.filter(Boolean) : [],
    };
  } catch (error) {
    console.error('xAI responses request failed:', error);
    return null;
  }
}

type XaiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
};

/** OpenAI-compatible chat completion against api.x.ai */
export async function xaiChatCompletion(options: {
  messages: XaiMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return null;

  const res = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model ?? getXaiChatModel(),
      temperature: options.temperature ?? 0,
      max_tokens: options.max_tokens ?? 500,
      stream: false,
      messages: options.messages,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('xAI chat error:', errBody);
    try {
      const errJson = JSON.parse(errBody) as { error?: string; code?: string };
      if (errJson.code === 'permission-denied' || errJson.error?.includes('credits')) {
        console.error('[xAI] Team has no API credits — add billing at https://console.x.ai');
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? null;
}

/** Grok vision only accepts JPEG/PNG — returns null for other types. */
export function xaiVisionMimeType(mimeType: string): 'image/jpeg' | 'image/png' | null {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'image/jpeg';
  if (mimeType === 'image/png') return 'image/png';
  return null;
}

function parseVisionJsonReply<T>(content: string | null): T | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

export async function xaiVisionJson<T>(options: {
  prompt: string;
  imageBase64: string;
  mimeType: string;
  model?: string;
  max_tokens?: number;
  detail?: 'low' | 'high';
}): Promise<T | null> {
  const visionMime = xaiVisionMimeType(options.mimeType);
  if (!visionMime) return null;

  const content = await xaiChatCompletion({
    model: options.model ?? getXaiVisionModel(),
    max_tokens: options.max_tokens ?? 200,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: options.prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${visionMime};base64,${options.imageBase64}`,
              detail: options.detail ?? 'low',
            },
          },
        ],
      },
    ],
  });

  return parseVisionJsonReply<T>(content);
}

export async function xaiVisionJsonMulti<T>(options: {
  prompt: string;
  images: Array<{ base64: string; mimeType: string }>;
  model?: string;
  max_tokens?: number;
  detail?: 'low' | 'high';
}): Promise<T | null> {
  const parts: Array<Record<string, unknown>> = [{ type: 'text', text: options.prompt }];

  for (const [index, image] of options.images.entries()) {
    const visionMime = xaiVisionMimeType(image.mimeType);
    if (!visionMime) continue;
    parts.push({
      type: 'text',
      text: `Image ${index + 1} of ${options.images.length}:`,
    });
    parts.push({
      type: 'image_url',
      image_url: {
        url: `data:${visionMime};base64,${image.base64}`,
        detail: options.detail ?? 'high',
      },
    });
  }

  if (parts.length <= 1) return null;

  const content = await xaiChatCompletion({
    model: options.model ?? getXaiVisionModel(),
    max_tokens: options.max_tokens ?? 2000,
    messages: [{ role: 'user', content: parts }],
  });

  return parseVisionJsonReply<T>(content);
}