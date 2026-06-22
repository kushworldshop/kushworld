import {
  buildFlowerStrainContext,
  formatFlowerStrainContextForPrompt,
  isFlowerProductCategory,
} from '@/lib/flowerStrainResearch';
import { getSiteContent } from '@/lib/siteContent';
import { CATEGORY_SEO } from '@/lib/seo';
import { getMerchSubcategoryLabel } from '@/lib/merch';
import {
  getProductDescriptionToneInstructions,
  normalizeProductDescriptionTone,
  type ProductDescriptionTone,
} from '@/lib/grokProductDescriptionTones';
import { getProductCategoryLabel } from '@/lib/shopNavigation';
import { isXaiConfigured, xaiChatCompletion } from '@/lib/xai';

export type { ProductDescriptionTone } from '@/lib/grokProductDescriptionTones';

export interface ProductDescriptionInput {
  productId: string;
  name: string;
  category: string;
  subcategory?: string;
  merchSubcategory?: string;
  price: number;
  image?: string;
  existingDescription?: string;
  tone?: ProductDescriptionTone;
}

function stripGeneratedDescription(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
  }
  return cleaned.replace(/^["']|["']$/g, '').trim();
}

function buildProductDescriptionPrompt(
  input: ProductDescriptionInput,
  flowerStrainSection?: string
): string {
  const tone = normalizeProductDescriptionTone(input.tone);
  const content = CATEGORY_SEO[input.category];
  const isFlower = isFlowerProductCategory(input.category);
  const categoryLabel =
    input.category === 'merch' && input.merchSubcategory
      ? `${getMerchSubcategoryLabel(input.merchSubcategory)}`
      : input.category;

  const seoKeywords = content?.keywords?.join(', ') ?? 'Kush World, lab tested hemp';
  const wordTarget =
    tone === 'concise' ? '80–120 words' : '140–220 words';

  const strainRules = isFlower && flowerStrainSection
    ? `- Use the STRAIN RESEARCH section below for lineage, aroma/flavor, and visual details.
- Do not invent genetics or terpenes beyond what research provides.`
    : isFlower
      ? `- If strain lineage is unclear, use premium hemp flower language without inventing genetics.`
      : `- Do not invent strain genetics, terpene profiles, or lab results not in the product data.`;

  return `You write product descriptions for Kush World (kushworld.shop), a premium hemp and studio merch retailer.

Write ONE product description for the item below.

${getProductDescriptionToneInstructions(tone)}

PRODUCT DATA:
- ID: ${input.productId}
- Name: ${input.name}
- Category: ${input.category} (${categoryLabel})
${input.subcategory ? `- Sub-section: ${input.subcategory}` : ''}
${input.merchSubcategory ? `- Merch type: ${getMerchSubcategoryLabel(input.merchSubcategory)}` : ''}
- Price: $${input.price.toFixed(2)}
${input.existingDescription ? `- Current description (improve/expand, do not copy verbatim):\n${input.existingDescription}` : ''}
${flowerStrainSection ? `\n${flowerStrainSection}\n` : ''}

SEO & STRUCTURE:
- Open with a compelling sentence that includes the product name and a primary category keyword naturally.
- Target ${wordTarget}. Use short paragraphs (2–3 sentences each) or a brief intro plus 3–4 bullet features.
- Weave in relevant keywords naturally: ${seoKeywords}
- Write for humans first; avoid keyword stuffing, ALL CAPS hype, or spammy repetition.
${isFlower ? '- For flower: include strain lineage or type, aroma/flavor notes, and visual quality cues when research provides them.' : ''}

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
${strainRules}`;
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

  let flowerStrainSection: string | undefined;
  if (isFlowerProductCategory(input.category)) {
    const strainContext = await buildFlowerStrainContext({
      productName: input.name,
      imageUrl: input.image,
    });
    flowerStrainSection = formatFlowerStrainContextForPrompt(strainContext);
  }

  const userPrompt = `${buildProductDescriptionPrompt(input, flowerStrainSection)}

Use display category label "${categoryLabel}" where it reads naturally in the copy.`;

  const reply = await xaiChatCompletion({
    messages: [
      {
        role: 'system',
        content: isFlowerProductCategory(input.category)
          ? 'You are an expert e-commerce copywriter for regulated hemp retail. You write SEO-friendly, compliant flower descriptions using provided strain research from product photos and public databases.'
          : 'You are an expert e-commerce copywriter for regulated hemp retail. You write SEO-friendly, compliant product descriptions only.',
      },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.35,
    max_tokens: 900,
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