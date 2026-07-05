import {
  buildFlowerStrainContext,
  formatFlowerStrainContextForPrompt,
  isFlowerProductCategory,
} from '@/lib/flowerStrainResearch';
import {
  analyzeProductCatalogImages,
  formatProductImageAnalysisForPrompt,
  optionGroupsFromImageAnalysis,
  summarizeProductImageAnalysis,
  type ProductCatalogImageAnalysis,
} from '@/lib/productImageAnalysis';
import { getSiteContent } from '@/lib/siteContent';
import { CATEGORY_SEO } from '@/lib/seo';
import { getMerchSubcategoryLabel } from '@/lib/merch';
import {
  getProductDescriptionToneInstructions,
  normalizeProductDescriptionTone,
  type ProductDescriptionTone,
} from '@/lib/grokProductDescriptionTones';
import { getProductCategoryLabel } from '@/lib/shopNavigation';
import { getProductMedia, type ProductMediaItem } from '@/lib/productMedia';
import type { ProductOptionGroup } from '@/lib/productOptions';
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
  media?: ProductMediaItem[];
  existingDescription?: string;
  tone?: ProductDescriptionTone;
}

export interface GrokProductDescriptionResult {
  description: string;
  suggestedName?: string;
  suggestedOptionGroups?: ProductOptionGroup[];
  insights?: string;
  imageAnalysis?: ProductCatalogImageAnalysis;
}

function stripGeneratedDescription(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
  }
  return cleaned.replace(/^["']|["']$/g, '').trim();
}

function collectImageUrls(input: ProductDescriptionInput): string[] {
  if (input.media?.length) {
    return input.media.filter((item) => item.type === 'image').map((item) => item.url);
  }
  if (input.image?.trim()) {
    return getProductMedia({ image: input.image, media: input.media })
      .filter((item) => item.type === 'image')
      .map((item) => item.url);
  }
  return [];
}

function buildProductDescriptionPrompt(
  input: ProductDescriptionInput,
  sections: string[]
): string {
  const tone = normalizeProductDescriptionTone(input.tone);
  const content = CATEGORY_SEO[input.category];
  const isFlower = isFlowerProductCategory(input.category);
  const categoryLabel =
    input.category === 'merch' && input.merchSubcategory
      ? `${getMerchSubcategoryLabel(input.merchSubcategory)}`
      : input.category;

  const seoKeywords = content?.keywords?.join(', ') ?? 'Kush World, lab tested hemp';
  const wordTarget = tone === 'concise' ? '80–120 words' : '140–220 words';

  const strainRules = isFlower
    ? `- Use strain research, photo analysis, and brand cross-reference when provided — do not invent genetics beyond that data.`
    : `- Use full photo analysis and brand cross-reference for kit contents, flavors, and naming — only use flavors from the final merged list.`;

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
${sections.length ? `\n${sections.join('\n\n')}\n` : ''}

SEO & STRUCTURE:
- Open with a compelling sentence that includes the product name and a primary category keyword naturally.
- Target ${wordTarget}. Use short paragraphs (2–3 sentences each) or a brief intro plus 3–4 bullet features.
- Weave in relevant keywords naturally: ${seoKeywords}
- Write for humans first; avoid keyword stuffing, ALL CAPS hype, or spammy repetition.
- When photo analysis lists kit contents (e.g. vape + pre-roll), mention what's included in the box.

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
): Promise<GrokProductDescriptionResult | { error: string }> {
  if (!isXaiConfigured()) {
    return { error: 'Grok is not configured. Add XAI_API_KEY on the server.' };
  }

  if (!input.name.trim()) {
    return { error: 'Product name is required' };
  }

  const siteContent = await getSiteContent();
  const categoryLabel = getProductCategoryLabel(siteContent.shopNavigation, input.category);
  const imageUrls = collectImageUrls(input);

  const promptSections: string[] = [];
  let imageAnalysis: ProductCatalogImageAnalysis | null = null;
  let suggestedOptionGroups: ProductOptionGroup[] | undefined;
  let suggestedName: string | undefined;

  if (imageUrls.length > 0) {
    imageAnalysis = await analyzeProductCatalogImages({
      imageUrls,
      productName: input.name,
      category: input.category,
    });

    if (imageAnalysis) {
      promptSections.push(formatProductImageAnalysisForPrompt(imageAnalysis));
      suggestedName = imageAnalysis.detectedProductName;
      suggestedOptionGroups = optionGroupsFromImageAnalysis(imageAnalysis, input.category);
      if (suggestedOptionGroups.length === 0) {
        suggestedOptionGroups = undefined;
      }
    }
  }

  if (isFlowerProductCategory(input.category)) {
    const strainContext = await buildFlowerStrainContext({
      productName: suggestedName ?? input.name,
      imageUrls,
    });
    promptSections.push(formatFlowerStrainContextForPrompt(strainContext));
  }

  const userPrompt = `${buildProductDescriptionPrompt(input, promptSections)}

Use display category label "${categoryLabel}" where it reads naturally in the copy.
${imageAnalysis?.detectedProductName ? `Prefer the detected product name "${imageAnalysis.detectedProductName}" when it fits naturally.` : ''}`;

  const reply = await xaiChatCompletion({
    messages: [
      {
        role: 'system',
        content:
          'You are an expert e-commerce copywriter for regulated hemp retail. You write SEO-friendly, compliant descriptions using full product photo analysis, authentic brand release cross-reference, and strain research. Use official brand flavor names and kit contents when provided.',
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

  const insights = imageAnalysis
    ? summarizeProductImageAnalysis(imageAnalysis)
    : imageUrls.length > 0
      ? 'Photos uploaded but vision analysis returned no structured data — description written from product fields only.'
      : 'No product photos uploaded — add images in the Photos tab for flavor/menu analysis.';

  return {
    description,
    suggestedName,
    suggestedOptionGroups,
    insights,
    imageAnalysis: imageAnalysis ?? undefined,
  };
}