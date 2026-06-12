import { isXaiConfigured, xaiVisionJson } from '@/lib/xai';

export type IdPhotoValidationMethod = 'heuristic' | 'vision' | 'skipped';

export type IdPhotoValidationResult = {
  accepted: boolean;
  reason: string;
  method: IdPhotoValidationMethod;
};

const VISION_PROMPT = `You review uploads for a 21+ hemp shop age verification system.

Determine whether this image clearly shows a government-issued photo ID document (US driver's license, state ID card, passport ID page, military ID, or similar official ID).

Respond with JSON only:
{"isGovernmentId": boolean, "reason": "one short sentence"}

Set isGovernmentId to false if the image is: a selfie, random photo, pet, scenery, meme, screenshot, blank, too blurry to read, only a credit card, only a birth certificate without photo ID, a non-government document, or anything that is clearly not a government-issued photo ID.

Set isGovernmentId to true only when a government-issued photo ID is the main subject and legible enough for staff review.`;

export function isIdPhotoVisionConfigured(): boolean {
  return !!(
    process.env.XAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim()
  );
}

function getImageDimensions(
  buffer: Buffer,
  mimeType: string
): { width: number; height: number } | null {
  if (mimeType === 'image/png' && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    let offset = 2;
    while (offset < buffer.length - 9) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xc0 || marker === 0xc2 || marker === 0xc1) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      const segmentLength = buffer.readUInt16BE(offset + 2);
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
  }

  if (mimeType === 'image/webp' && buffer.length >= 30) {
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    if (riff === 'RIFF' && webp === 'WEBP') {
      const chunk = buffer.toString('ascii', 12, 16);
      if (chunk === 'VP8 ') {
        return {
          width: buffer.readUInt16LE(26) & 0x3fff,
          height: buffer.readUInt16LE(28) & 0x3fff,
        };
      }
      if (chunk === 'VP8L' && buffer.length >= 25) {
        const bits = buffer.readUInt32LE(21);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
    }
  }

  return null;
}

function runHeuristicChecks(buffer: Buffer, mimeType: string): IdPhotoValidationResult | null {
  if (buffer.length < 12_000) {
    return {
      accepted: false,
      reason: 'Image is too small or unreadable. Upload a clear, full photo of your ID.',
      method: 'heuristic',
    };
  }

  const dimensions = getImageDimensions(buffer, mimeType);
  if (!dimensions) return null;

  const { width, height } = dimensions;
  const minSide = Math.min(width, height);
  const maxSide = Math.max(width, height);
  const aspect = maxSide / Math.max(minSide, 1);

  if (minSide < 240) {
    return {
      accepted: false,
      reason: 'Photo resolution is too low. Move closer and upload a sharper image of your ID.',
      method: 'heuristic',
    };
  }

  if (height > width * 1.35) {
    return {
      accepted: false,
      reason: 'This looks like a portrait photo, not an ID. Lay your ID flat and photograph the full card.',
      method: 'heuristic',
    };
  }

  if (aspect > 3.2) {
    return {
      accepted: false,
      reason: 'This image does not look like a standard ID photo. Upload a full government-issued ID.',
      method: 'heuristic',
    };
  }

  return null;
}

function parseVisionJson(raw: string): { isGovernmentId: boolean; reason: string } | null {
  try {
    const parsed = JSON.parse(raw) as { isGovernmentId?: boolean; reason?: string };
    if (typeof parsed.isGovernmentId !== 'boolean') return null;
    return {
      isGovernmentId: parsed.isGovernmentId,
      reason:
        typeof parsed.reason === 'string' && parsed.reason.trim()
          ? parsed.reason.trim()
          : parsed.isGovernmentId
            ? 'Government ID detected'
            : 'Image does not appear to be a government-issued ID',
    };
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return parseVisionJson(match[0]);
    } catch {
      return null;
    }
  }
}

async function validateWithGrok(buffer: Buffer, mimeType: string): Promise<IdPhotoValidationResult | null> {
  if (!isXaiConfigured()) return null;

  const parsed = await xaiVisionJson<{ isGovernmentId?: boolean; reason?: string }>({
    prompt: VISION_PROMPT,
    imageBase64: buffer.toString('base64'),
    mimeType,
  });

  if (!parsed || typeof parsed.isGovernmentId !== 'boolean') {
    console.error('Grok ID validation returned invalid JSON');
    return null;
  }

  const reason =
    typeof parsed.reason === 'string' && parsed.reason.trim()
      ? parsed.reason.trim()
      : parsed.isGovernmentId
        ? 'Government ID detected'
        : 'Image does not appear to be a government-issued ID';

  return parsed.isGovernmentId
    ? { accepted: true, reason, method: 'vision' }
    : { accepted: false, reason, method: 'vision' };
}

async function validateWithOpenAI(buffer: Buffer, mimeType: string): Promise<IdPhotoValidationResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const base64 = buffer.toString('base64');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error('OpenAI ID validation error:', await res.text());
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = parseVisionJson(content);
  if (!parsed) return null;

  return parsed.isGovernmentId
    ? { accepted: true, reason: parsed.reason, method: 'vision' }
    : {
        accepted: false,
        reason: parsed.reason,
        method: 'vision',
      };
}

async function validateWithGemini(buffer: Buffer, mimeType: string): Promise<IdPhotoValidationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
        contents: [
          {
            parts: [
              { text: VISION_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: buffer.toString('base64'),
                },
              },
            ],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    console.error('Gemini ID validation error:', await res.text());
    return null;
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') ?? '';
  if (!content) return null;

  const parsed = parseVisionJson(content);
  if (!parsed) return null;

  return parsed.isGovernmentId
    ? { accepted: true, reason: parsed.reason, method: 'vision' }
    : {
        accepted: false,
        reason: parsed.reason,
        method: 'vision',
      };
}

export async function validateIdPhoto(
  buffer: Buffer,
  mimeType: string
): Promise<IdPhotoValidationResult> {
  const heuristicFailure = runHeuristicChecks(buffer, mimeType);
  if (heuristicFailure) return heuristicFailure;

  const vision =
    (await validateWithGrok(buffer, mimeType)) ??
    (await validateWithOpenAI(buffer, mimeType)) ??
    (await validateWithGemini(buffer, mimeType));

  if (vision) return vision;

  if (!isIdPhotoVisionConfigured()) {
    console.warn(
      '[ID validation] No XAI_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY — skipping vision auto-review; manual review required.'
    );
  }

  return {
    accepted: true,
    reason: 'Pending manual review by Kush World staff',
    method: 'skipped',
  };
}

export function buildAutoRejectionMessage(reason: string): string {
  return `This doesn't appear to be a government-issued ID. ${reason} Please upload a clear photo of your driver's license, state ID, or passport.`;
}