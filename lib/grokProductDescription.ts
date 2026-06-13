import { getSiteContent } from '@/lib/siteContent';
import { CATEGORY_SEO } from '@/lib/seo';
import { getMerchSubcategoryLabel } from '@/lib/merch';
import { getProductCategoryLabel } from '@/lib/shopNavigation';
import { isXaiConfigured, xaiChatCompletion } from '@/lib/xai';

export interface ProductDescriptionInput {
  productId: string;
  name: string;
  category: string;
  subcategory?: string;
  merchSubcategory?: string;
  price: number;
  existingDescription?: string;
}

function stripGeneratedDescription(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
  }
  return cleaned.replace(/^["']|["']$/g, '').trim();
}

function buildProductDescriptionPrompt(input: ProductDescriptionInput): string {
  const content = CATEGORY_SEO[input.category];
  const categoryLabel =
    input.category === 'merch' && input.merchSubcategory
      ? `${getMerchSubcategoryLabel(input.merchSubcategory)}`
      : input.category;

  const seoKeywords = content?.keywords?.join(', ') ?? 'Kush World, lab tested hemp';

  return `You write product descriptions for Kush World (kushworld.shop), a premium hemp and studio merch retailer.

Write ONE product description for the item below. Match the tone of top compliant hemp retailers (professional, trustworthy, premium — similar to TVN Family and other lab-focused hemp brands).

PRODUCT DATA:
- ID: ${input.productId}
- Name: ${input.name}
- Category: ${input.category} (${categoryLabel})
${input.subcategory ? `- Sub-section: ${input.subcategory}` : ''}
${input.merchSubcategory ? `- Merch type: ${getMerchSubcategoryLabel(input.merchSubcategory)}` : ''}
- Price: $${input.price.toFixed(2)}
${input.existingDescription ? `- Current description (improve/expand, do not copy verbatim):\n${input.existingDescription}` : ''}

SEO & STRUCTURE:
- Open with a compelling sentence that includes the product name and a primary category keyword naturally.
- Target 140–220 words. Use short paragraphs (2–3 sentences each) or a brief intro plus 3–4 bullet features.
- Weave in relevant keywords naturally: ${seoKeywords}
- Write for humans first; avoid keyword stuffing, ALL CAPS hype, or spammy repetition.

COMPLIANCE (hemp categories — NOT merch):
- Hemp products are for adults 21+ only.
- Say lab-tested / third-party tested; COA available when applicable.
- Use compliant language: hemp-derived, Farm Bill compliant, no medical claims, no guaranteed effects, no cure/treat/diagnose language.
- Do not claim legality in every state; say discreet nationwide shipping where appropriate.
- Never mention THC percentages unless given in product data (not provided — do not invent potency numbers).

MERCH CATEGORY:
- Focus on Kush World Studio brand, apparel quality, fit, and made-to-order/custom print if relevant.
- No age-gate or hemp compliance language for merch.

OUTPUT RULES:
- Return ONLY the product description text — no title, no preamble, no "Here's the description".
- No markdown headings. Plain text or simple bullet lines with "•" only.
- Do not invent strain genetics, terpene profiles, or lab results not in the product data.`;
}

export async function generateProductDescriptionWithGrok(
  input: ProductDescriptionInput
): Promise<{ description: string } | { error: string }> {
  if (!isXaiConfigured()) {
    return { error: 'Grok is not configured. Add XAI_API_KEY on the server.' };
  }

  if (!input.name.trim()) {
    return { error: 'Product name is required' };
  }

  const siteContent = await getSiteContent();
  const categoryLabel = getProductCategoryLabel(siteContent.shopNavigation, input.category);

  const userPrompt = `${buildProductDescriptionPrompt(input)}

Use display category label "${categoryLabel}" where it reads naturally in the copy.`;

  const reply = await xaiChatCompletion({
    messages: [
      {
        role: 'system',
        content:
          'You are an expert e-commerce copywriter for regulated hemp retail. You write SEO-friendly, compliant product descriptions only.',
      },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.35,
    max_tokens: 700,
  });

  if (!reply) {
    return {
      error:
        'Grok could not generate a description. Check XAI_API_KEY and API credits at console.x.ai.',
    };
  }

  const description = stripGeneratedDescription(reply);
  if (description.length < 40) {
    return { error: 'Generated description was too short. Try again.' };
  }

  return { description };
}