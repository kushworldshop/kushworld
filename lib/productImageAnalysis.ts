import { clampProductOptionGroups, type ProductOptionGroup } from '@/lib/productOptions';
import { loadProductImageSet } from '@/lib/productImageIO';
import { isXaiConfigured, xaiVisionJsonMulti } from '@/lib/xai';

export interface ProductImageNote {
  imageIndex: number;
  imageRole: string;
  details: string;
}

export interface ProductCatalogImageAnalysis {
  detectedProductName: string;
  detectedBrand?: string;
  detectedEdition?: string;
  kitContents: string[];
  packagingSummary: string;
  flavorOrVariantLabels: string[];
  optionGroupLayout: 'size_and_flavor' | 'flavor_only' | 'variant_only' | 'model_and_color' | 'none';
  sizeOptions?: string[];
  fullBoxLabel?: string;
  singleUnitLabel?: string;
  modelOptions?: string[];
  colorOptions?: string[];
  visualHighlights: string[];
  perImageNotes: ProductImageNote[];
  confidence: 'high' | 'medium' | 'low';
}

const CATALOG_VISION_PROMPT = `You are a precise product catalog analyst for Kush World hemp shop admin.

You will receive multiple product photos for ONE listing. Study EVERY image carefully:
- Hero / packaging shots: read exact product name, brand, edition, and what is included in the kit.
- Flavor menus, strain charts, back-of-box lists: transcribe EVERY flavor/variant label EXACTLY as printed (spelling, caps, punctuation).
- Concentrate box photos: note if it is a full multi-jar box vs single jars; read all strain names on the chart.

Return JSON only:
{
  "detectedProductName": "exact customer-facing product title from packaging",
  "detectedBrand": "brand line if visible",
  "detectedEdition": "edition name if visible (e.g. Gamer Edition)",
  "kitContents": ["list each included item, e.g. disposable vape, pre-roll, charger"],
  "packagingSummary": "2-3 sentences describing what the product is and what buyer receives",
  "flavorOrVariantLabels": ["every flavor/strain/variant name read from menus — exact spelling"],
  "optionGroupLayout": "size_and_flavor | flavor_only | variant_only | model_and_color | none",
  "sizeOptions": ["only if box/unit sizes are visible"],
  "fullBoxLabel": "e.g. Full Box if multi-unit box product",
  "singleUnitLabel": "e.g. Single 1oz Jar if applicable",
  "modelOptions": ["device models if applicable"],
  "colorOptions": ["colors if applicable"],
  "visualHighlights": ["3-6 merchandising details visible in photos"],
  "perImageNotes": [
    { "imageIndex": 1, "imageRole": "hero|flavor_chart|back_label|lifestyle|other", "details": "what this image shows" }
  ],
  "confidence": "high | medium | low"
}

Rules:
- flavorOrVariantLabels: ONLY names you can read in the images. Do not invent or guess missing entries.
- If a flavor chart has 20 names, return all 20 with exact spelling.
- Stoner Stix style kits: usually variant_only with gamer-themed flavor names; kit often includes vape + pre-roll.
- Concentrate passport/box products: size_and_flavor with Full Box + Single 1oz Jar and separate flavor list.
- Disposable vapes / pre-roll bundles: variant_only or flavor_only.
- If no flavor menu is visible, return empty flavorOrVariantLabels and optionGroupLayout "none".
- No THC potency claims. Describe packaging only.`;

function parseJsonFromReply<T>(reply: string | null): T | null {
  if (!reply) return null;
  try {
    return JSON.parse(reply) as T;
  } catch {
    const match = reply.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of labels) {
    const cleaned = label.trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

export function optionGroupsFromImageAnalysis(
  analysis: ProductCatalogImageAnalysis,
  category: string
): ProductOptionGroup[] {
  const flavors = uniqueLabels(analysis.flavorOrVariantLabels).map((label) => ({ label }));
  const layout = analysis.optionGroupLayout;

  if (layout === 'size_and_flavor' && flavors.length > 0) {
    return clampProductOptionGroups([
      {
        name: 'Size',
        values: [
          { label: analysis.fullBoxLabel?.trim() || 'Full Box' },
          { label: analysis.singleUnitLabel?.trim() || 'Single 1oz Jar' },
        ],
      },
      { name: 'Flavor', values: flavors },
    ]);
  }

  if (layout === 'model_and_color') {
    const models = uniqueLabels(analysis.modelOptions ?? []).map((label) => ({ label }));
    const colors = uniqueLabels(analysis.colorOptions ?? []).map((label) => ({ label }));
    const groups: ProductOptionGroup[] = [];
    if (models.length > 0) groups.push({ name: 'Model', values: models });
    if (colors.length > 0) groups.push({ name: 'Color', values: colors });
    if (groups.length > 0) return clampProductOptionGroups(groups);
  }

  if (flavors.length === 0) return [];

  const normalizedCategory = category.toLowerCase().trim();
  const groupName =
    layout === 'variant_only' || normalizedCategory === 'vapes' || normalizedCategory === 'vaporizers'
      ? 'Variant'
      : 'Flavor';

  return clampProductOptionGroups([{ name: groupName, values: flavors }]);
}

export function formatProductImageAnalysisForPrompt(analysis: ProductCatalogImageAnalysis): string {
  const lines = [
    'PRODUCT PHOTO ANALYSIS (from uploaded images — treat as ground truth for naming and options):',
    `- Detected name: ${analysis.detectedProductName}`,
  ];

  if (analysis.detectedBrand) lines.push(`- Brand: ${analysis.detectedBrand}`);
  if (analysis.detectedEdition) lines.push(`- Edition: ${analysis.detectedEdition}`);
  if (analysis.kitContents.length) lines.push(`- Kit includes: ${analysis.kitContents.join(', ')}`);
  lines.push(`- Packaging: ${analysis.packagingSummary}`);
  if (analysis.flavorOrVariantLabels.length) {
    lines.push(`- Flavors/variants read from photos (${analysis.flavorOrVariantLabels.length}): ${analysis.flavorOrVariantLabels.join(', ')}`);
  }
  if (analysis.visualHighlights.length) {
    lines.push(`- Visual highlights: ${analysis.visualHighlights.join('; ')}`);
  }
  if (analysis.perImageNotes.length) {
    lines.push('- Per-image notes:');
    for (const note of analysis.perImageNotes) {
      lines.push(`  • Image ${note.imageIndex} (${note.imageRole}): ${note.details}`);
    }
  }
  lines.push(`- Analysis confidence: ${analysis.confidence}`);
  lines.push(
    '',
    'Use detected product name, kit contents, and flavor names in the description.',
    'Mention everything included in the kit (e.g. vape + pre-roll) when photos show it.',
    'Do not invent flavors or items not supported by the photo analysis.'
  );

  return lines.join('\n');
}

export function summarizeProductImageAnalysis(analysis: ProductCatalogImageAnalysis): string {
  const parts: string[] = [];
  if (analysis.detectedProductName) parts.push(`Name: ${analysis.detectedProductName}`);
  if (analysis.kitContents.length) parts.push(`Includes: ${analysis.kitContents.join(' + ')}`);
  if (analysis.flavorOrVariantLabels.length) {
    parts.push(`${analysis.flavorOrVariantLabels.length} flavors/variants from photos`);
  }
  parts.push(`${analysis.confidence} confidence`);
  return parts.join(' · ');
}

export async function analyzeProductCatalogImages(input: {
  imageUrls: string[];
  productName?: string;
  category?: string;
}): Promise<ProductCatalogImageAnalysis | null> {
  if (!isXaiConfigured()) return null;

  const images = await loadProductImageSet(input.imageUrls);
  if (images.length === 0) return null;

  const contextLine = [
    input.productName ? `Current admin product name: ${input.productName}` : '',
    input.category ? `Category: ${input.category}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const parsed = await xaiVisionJsonMulti<ProductCatalogImageAnalysis>({
    prompt: `${CATALOG_VISION_PROMPT}${contextLine ? `\n\n${contextLine}` : ''}`,
    images: images.map((image) => ({
      base64: image.buffer.toString('base64'),
      mimeType: image.mimeType,
    })),
    max_tokens: 2500,
    detail: 'high',
  });

  if (!parsed?.detectedProductName) return null;

  return {
    detectedProductName: parsed.detectedProductName.trim(),
    detectedBrand: parsed.detectedBrand?.trim() || undefined,
    detectedEdition: parsed.detectedEdition?.trim() || undefined,
    kitContents: uniqueLabels(parsed.kitContents ?? []),
    packagingSummary: parsed.packagingSummary?.trim() || '',
    flavorOrVariantLabels: uniqueLabels(parsed.flavorOrVariantLabels ?? []),
    optionGroupLayout: parsed.optionGroupLayout ?? 'none',
    sizeOptions: uniqueLabels(parsed.sizeOptions ?? []),
    fullBoxLabel: parsed.fullBoxLabel?.trim() || undefined,
    singleUnitLabel: parsed.singleUnitLabel?.trim() || undefined,
    modelOptions: uniqueLabels(parsed.modelOptions ?? []),
    colorOptions: uniqueLabels(parsed.colorOptions ?? []),
    visualHighlights: uniqueLabels(parsed.visualHighlights ?? []),
    perImageNotes: (parsed.perImageNotes ?? []).filter((note) => note?.details?.trim()),
    confidence: parsed.confidence ?? 'medium',
  };
}