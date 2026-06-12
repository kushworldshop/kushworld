import { getProductBySlug } from '@/lib/productCatalog';
import { getProductDescription, type Product } from '@/lib/products';
import { getSiteContent } from '@/lib/siteContent';
import type { SiteContent } from '@/lib/siteContentTypes';
import { isXaiConfigured, xaiChatCompletion } from '@/lib/xai';

export type GrokChatMode = 'support' | 'product' | 'admin' | 'content';

export type GrokChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const BASE_RULES = `You are Grok, the AI assistant for Kush World (kushworld.shop) — a lab-tested hemp shop and Kush World Studio merch store.

Rules:
- Be helpful, concise, and professional. Use a friendly tone aligned with cannabis culture but stay compliant.
- Hemp products are for adults 21+ only. Never encourage illegal drug use or underage access.
- Do not invent order status, tracking numbers, or account details you were not given.
- If you cannot answer from provided context, say so and direct the customer to email support or use the contact form.
- Never share internal admin data with customers.
- Keep replies under 200 words unless drafting admin content.`;

function formatFaq(content: SiteContent): string {
  return content.faq.items.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join('\n\n');
}

export function buildSupportSystemPrompt(content: SiteContent): string {
  return `${BASE_RULES}

You are on the Contact / Support page. Help with orders, shipping, ID verification, loyalty points, payments (card, Bitcoin, Zelle, PayPal, Chime), returns, and general shop questions.

Contact email: ${content.contact.email}
Response time: ${content.contact.responseTime}
Brand: ${content.brand.name} — ${content.brand.tagline}

FAQ:
${formatFaq(content)}

Shipping policy excerpt:
${content.policies.shipping.body.slice(0, 1200)}

Returns policy excerpt:
${content.policies.returns.body.slice(0, 800)}`;
}

export function buildProductSystemPrompt(product: Product, content: SiteContent): string {
  const description = getProductDescription(product);
  const coa = product.coaPdf ? `COA available: ${product.coaPdf}` : 'No COA on file for this product.';
  const tiers = product.tierPricing?.length
    ? `Volume pricing: ${product.tierPricing.map((t) => `${t.minQty}+ @ $${t.price}`).join(', ')}`
    : '';

  return `${BASE_RULES}

You are on a product page. Answer questions about THIS product only. Do not recommend competitors.

Product: ${product.name}
Category: ${product.category}
Price: $${product.price}
${product.compareAtPrice ? `Compare at: $${product.compareAtPrice}` : ''}
${tiers}
In stock: ${product.inStock !== false ? 'yes' : 'no'}
${coa}

Description:
${description}

General shop FAQ (for shipping/returns context):
${formatFaq(content).slice(0, 2000)}`;
}

export function buildAdminSystemPrompt(task: string, context: Record<string, unknown>): string {
  return `${BASE_RULES}

You are assisting Kush World admin staff in the admin panel. Be direct and actionable.

Task: ${task}

Member / context data:
${JSON.stringify(context, null, 2)}

For ID rejection drafts: be polite, professional, explain what to fix (blurry, cropped, expired, not government ID), invite re-upload.
For member summaries: bullet key facts only.
For content drafts: match Kush World brand voice — lab-tested, discreet shipping, 21+, community-focused.`;
}

export function buildContentSystemPrompt(contentType: string, existingText: string): string {
  return `${BASE_RULES}

You are helping admin write site content for Kush World.

Content type: ${contentType}

Existing draft (may be empty):
${existingText || '(none)'}

Improve or generate copy. Return only the suggested content text — no preamble unless asked. Keep markdown formatting if the input uses it.`;
}

export async function runGrokChat(options: {
  mode: GrokChatMode;
  message: string;
  history?: GrokChatMessage[];
  productSlug?: string;
  adminTask?: string;
  adminContext?: Record<string, unknown>;
  contentType?: string;
  existingText?: string;
}): Promise<{ reply: string } | { error: string }> {
  if (!isXaiConfigured()) {
    return { error: 'Grok assistant is not configured. Add XAI_API_KEY to the server environment.' };
  }

  const trimmed = options.message.trim();
  if (!trimmed) return { error: 'Message is required' };
  if (trimmed.length > 2000) return { error: 'Message is too long (max 2000 characters)' };

  const history = (options.history ?? []).slice(-8);
  let systemPrompt: string;

  switch (options.mode) {
    case 'support': {
      const content = await getSiteContent();
      systemPrompt = buildSupportSystemPrompt(content);
      break;
    }
    case 'product': {
      if (!options.productSlug) return { error: 'Product not specified' };
      const product = await getProductBySlug(options.productSlug);
      if (!product) return { error: 'Product not found' };
      const content = await getSiteContent();
      systemPrompt = buildProductSystemPrompt(product, content);
      break;
    }
    case 'admin': {
      systemPrompt = buildAdminSystemPrompt(
        options.adminTask || 'general assistance',
        options.adminContext ?? {}
      );
      break;
    }
    case 'content': {
      systemPrompt = buildContentSystemPrompt(
        options.contentType || 'general',
        options.existingText || ''
      );
      break;
    }
    default:
      return { error: 'Invalid chat mode' };
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.map((entry) => ({ role: entry.role, content: entry.content })),
    { role: 'user', content: trimmed },
  ];

  const reply = await xaiChatCompletion({
    messages,
    temperature: 0.4,
    max_tokens: options.mode === 'content' ? 800 : 500,
  });

  if (!reply) {
    return { error: 'Grok could not generate a response. Try again in a moment.' };
  }

  return { reply: reply.trim() };
}