import {
  formatBrandResearchForPrompt,
  mergeFlavorLists,
  researchBrandProductRelease,
  type BrandReleaseResearch,
} from '@/lib/brandProductResearch';
import { clampProductOptionGroups, type ProductOptionGroup } from '@/lib/productOptions';
import { loadProductImageSet, type ProductImageBytes } from '@/lib/productImageIO';
import { isXaiConfigured, xaiVisionJson, xaiVisionJsonMulti } from '@/lib/xai';

export interface ProductImageNote {
  imageIndex: number;
  imageRole: string;
  details: string;
  flavorsRead?: string[];
  textBlocksRead?: string[];
}

export interface SingleImageAnalysis {
  imageIndex: number;
  imageRole:
    | 'brand_case'
    | 'flavor_chart'
    | 'hero_packaging'
    | 'product_kit'
    | 'strain_menu'
    | 'back_label'
    | 'lifestyle'
    | 'other';
  readableText: string[];
  flavorLabelsRead: string[];
  brandName?: string;
  productLine?: string;
  edition?: string;
  kitItemsVisible: string[];
  caseDescription: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ProductCatalogImageAnalysis {
  detectedProductName: string;
  detectedBrand?: string;
  detectedEdition?: string;
  kitContents: string[];
  packagingSummary: string;
  /** Flavors read directly from photos (OCR) */
  photoFlavorLabels: string[];
  /** Final merged list: photo OCR + brand cross-reference */
  flavorOrVariantLabels: string[];
  flavorMergeNotes?: string;
  brandResearch?: BrandReleaseResearch;
  optionGroupLayout: 'size_and_flavor' | 'flavor_only' | 'variant_only' | 'model_and_color' | 'none';
  sizeOptions?: string[];
  fullBoxLabel?: string;
  singleUnitLabel?: string;
  modelOptions?: string[];
  colorOptions?: string[];
  visualHighlights: string[];
  perImageNotes: ProductImageNote[];
  perImageAnalysis: SingleImageAnalysis[];
  confidence: 'high' | 'medium' | 'low';
}

const OVERVIEW_VISION_PROMPT = `You are a precise product catalog analyst for Kush World hemp shop admin.

You will receive multiple product photos for ONE listing. Study EVERY image — especially:
• BRAND CASE / DISPLAY CASE photos: read ALL flavor names printed on case lid, sides, dividers, and strain slots.
• FLAVOR CHART / MENU images: transcribe every row/column label exactly.
• HERO packaging: product name, brand logo, edition name, "includes" callouts.
• CONCENTRATE BOX: Full box vs single jar, strain chart on insert/lid.

Return JSON only:
{
  "detectedProductName": "exact customer-facing product title",
  "detectedBrand": "brand on packaging",
  "detectedEdition": "edition if visible",
  "kitContents": ["each included item visible or stated on packaging"],
  "packagingSummary": "2-4 sentences: what it is, brand case type, what buyer receives",
  "flavorOrVariantLabels": ["every flavor/strain name readable in ANY image — exact spelling"],
  "optionGroupLayout": "size_and_flavor | flavor_only | variant_only | model_and_color | none",
  "fullBoxLabel": "Full Box if applicable",
  "singleUnitLabel": "Single 1oz Jar if applicable",
  "modelOptions": [],
  "colorOptions": [],
  "visualHighlights": ["merchandising details"],
  "perImageNotes": [
    {
      "imageIndex": 1,
      "imageRole": "brand_case|flavor_chart|hero_packaging|product_kit|strain_menu|back_label|lifestyle|other",
      "details": "what this image shows — mention if it is a brand display case with flavor slots",
      "flavorsRead": ["flavors visible in THIS image only"],
      "textBlocksRead": ["other readable text on packaging"]
    }
  ],
  "confidence": "high | medium | low"
}

Rules:
- Brand case photographs often list every flavor on the case top or front panel — read them ALL.
- Do not skip small text on case dividers or flavor strips.
- Stoner Stix: Gamer Edition case lists themed flavor names; kit = vape + pre-roll.
- WHOLEMELTS / Arcadia: passport/box products list strains on chart; use size_and_flavor when box + singles sold.
- flavorOrVariantLabels = union of all flavors from all images.
- No THC potency claims.`;

const PER_IMAGE_CASE_PROMPT = `Analyze this product photo for Kush World admin catalog. Focus on READING ALL TEXT.

If this is a brand display case, case insert, or flavor menu:
- Transcribe EVERY flavor/strain/variant name printed on the case (lid, front, sides, slots).
- Read edition name, brand name, and "includes" items.

Return JSON only:
{
  "imageRole": "brand_case|flavor_chart|hero_packaging|product_kit|strain_menu|back_label|lifestyle|other",
  "readableText": ["all legible text blocks, labels, headers"],
  "flavorLabelsRead": ["every flavor name — exact spelling from packaging"],
  "brandName": "if visible",
  "productLine": "if visible",
  "edition": "if visible",
  "kitItemsVisible": ["items shown or listed as included"],
  "caseDescription": "1-2 sentences describing the case/packaging and where flavors are listed",
  "confidence": "high | medium | low"
}`;

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

async function analyzeSingleProductImage(
  image: ProductImageBytes,
  imageIndex: number
): Promise<SingleImageAnalysis | null> {
  const parsed = await xaiVisionJson<Omit<SingleImageAnalysis, 'imageIndex'>>({
    prompt: `${PER_IMAGE_CASE_PROMPT}\n\nThis is image ${imageIndex} of the product gallery.`,
    imageBase64: image.buffer.toString('base64'),
    mimeType: image.mimeType,
    max_tokens: 1200,
    detail: 'high',
  });

  if (!parsed) return null;

  return {
    imageIndex,
    imageRole: parsed.imageRole ?? 'other',
    readableText: uniqueLabels(parsed.readableText ?? []),
    flavorLabelsRead: uniqueLabels(parsed.flavorLabelsRead ?? []),
    brandName: parsed.brandName?.trim() || undefined,
    productLine: parsed.productLine?.trim() || undefined,
    edition: parsed.edition?.trim() || undefined,
    kitItemsVisible: uniqueLabels(parsed.kitItemsVisible ?? []),
    caseDescription: parsed.caseDescription?.trim() || '',
    confidence: parsed.confidence ?? 'medium',
  };
}

function collectPhotoFlavors(
  overviewFlavors: string[],
  perImageNotes: ProductImageNote[],
  perImageAnalysis: SingleImageAnalysis[]
): string[] {
  const all = [
    ...overviewFlavors,
    ...perImageNotes.flatMap((note) => note.flavorsRead ?? []),
    ...perImageAnalysis.flatMap((item) => item.flavorLabelsRead),
  ];
  return uniqueLabels(all);
}

function mergeKitContents(...sources: string[][]): string[] {
  return uniqueLabels(sources.flat());
}

function pickBestProductName(
  overviewName: string,
  brandResearch?: BrandReleaseResearch | null
): string {
  if (brandResearch?.officialProductName?.trim()) {
    return brandResearch.officialProductName.trim();
  }
  return overviewName.trim();
}

function resolveOptionLayout(
  layout: ProductCatalogImageAnalysis['optionGroupLayout'],
  category: string,
  hasFlavors: boolean,
  packagingSummary: string
): ProductCatalogImageAnalysis['optionGroupLayout'] {
  if (layout !== 'none') return layout;
  const normalized = category.toLowerCase();
  if (!hasFlavors) return 'none';
  if (
    normalized === 'concentrates' &&
    /box|passport|jar|1oz/i.test(packagingSummary)
  ) {
    return 'size_and_flavor';
  }
  if (normalized === 'vapes' || normalized === 'vaporizers') return 'variant_only';
  return 'flavor_only';
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
    'PRODUCT PHOTO ANALYSIS (full picture review — photos + brand cross-reference):',
    `- Detected name: ${analysis.detectedProductName}`,
  ];

  if (analysis.detectedBrand) lines.push(`- Brand: ${analysis.detectedBrand}`);
  if (analysis.detectedEdition) lines.push(`- Edition: ${analysis.detectedEdition}`);
  if (analysis.kitContents.length) lines.push(`- Kit includes: ${analysis.kitContents.join(', ')}`);
  lines.push(`- Packaging: ${analysis.packagingSummary}`);

  if (analysis.photoFlavorLabels.length) {
    lines.push(
      `- Flavors from photo OCR (${analysis.photoFlavorLabels.length}): ${analysis.photoFlavorLabels.join(', ')}`
    );
  }
  if (analysis.flavorOrVariantLabels.length) {
    lines.push(
      `- Final flavor list (${analysis.flavorOrVariantLabels.length}): ${analysis.flavorOrVariantLabels.join(', ')}`
    );
  }
  if (analysis.flavorMergeNotes) lines.push(`- Flavor merge: ${analysis.flavorMergeNotes}`);

  if (analysis.brandResearch) {
    lines.push('', formatBrandResearchForPrompt(analysis.brandResearch));
  }

  if (analysis.perImageAnalysis.length) {
    lines.push('- Per-image deep analysis:');
    for (const item of analysis.perImageAnalysis) {
      const flavorPart = item.flavorLabelsRead.length
        ? ` — flavors: ${item.flavorLabelsRead.join(', ')}`
        : '';
      lines.push(
        `  • Image ${item.imageIndex} [${item.imageRole}]: ${item.caseDescription || 'analyzed'}${flavorPart}`
      );
    }
  } else if (analysis.perImageNotes.length) {
    lines.push('- Per-image notes:');
    for (const note of analysis.perImageNotes) {
      const flavorPart = note.flavorsRead?.length ? ` — flavors: ${note.flavorsRead.join(', ')}` : '';
      lines.push(`  • Image ${note.imageIndex} (${note.imageRole}): ${note.details}${flavorPart}`);
    }
  }

  if (analysis.visualHighlights.length) {
    lines.push(`- Visual highlights: ${analysis.visualHighlights.join('; ')}`);
  }

  lines.push(`- Overall confidence: ${analysis.confidence}`);
  lines.push(
    '',
    'Use the final flavor list and official brand research in the description.',
    'Mention kit contents (e.g. vape + pre-roll) when confirmed by photos or brand data.',
    'Do not invent flavors beyond the final merged list.'
  );

  return lines.join('\n');
}

export function summarizeProductImageAnalysis(analysis: ProductCatalogImageAnalysis): string {
  const parts: string[] = [];
  if (analysis.detectedProductName) parts.push(`Name: ${analysis.detectedProductName}`);
  if (analysis.detectedBrand) parts.push(`Brand: ${analysis.detectedBrand}`);
  if (analysis.kitContents.length) parts.push(`Includes: ${analysis.kitContents.join(' + ')}`);
  if (analysis.photoFlavorLabels.length) {
    parts.push(`${analysis.photoFlavorLabels.length} flavors from photos`);
  }
  if (analysis.flavorOrVariantLabels.length) {
    parts.push(`${analysis.flavorOrVariantLabels.length} total flavors`);
  }
  if (analysis.brandResearch) {
    parts.push(`brand verified (${analysis.brandResearch.confidence})`);
  }
  if (analysis.perImageAnalysis.length) {
    const caseImages = analysis.perImageAnalysis.filter((i) => i.imageRole === 'brand_case').length;
    if (caseImages > 0) parts.push(`${caseImages} brand case photo(s) analyzed`);
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

  const images = await loadProductImageSet(input.imageUrls, 8);
  if (images.length === 0) return null;

  const contextLine = [
    input.productName ? `Current admin product name: ${input.productName}` : '',
    input.category ? `Category: ${input.category}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const overview = await xaiVisionJsonMulti<
    Omit<
      ProductCatalogImageAnalysis,
      'photoFlavorLabels' | 'flavorMergeNotes' | 'brandResearch' | 'perImageAnalysis'
    > & {
      flavorOrVariantLabels: string[];
      perImageNotes: Array<{
        imageIndex: number;
        imageRole: string;
        details: string;
        flavorsRead?: string[];
        textBlocksRead?: string[];
      }>;
    }
  >({
    prompt: `${OVERVIEW_VISION_PROMPT}${contextLine ? `\n\n${contextLine}` : ''}`,
    images: images.map((image) => ({
      base64: image.buffer.toString('base64'),
      mimeType: image.mimeType,
    })),
    max_tokens: 3200,
    detail: 'high',
  });

  if (!overview?.detectedProductName) return null;

  const overviewNotes: ProductImageNote[] = (overview.perImageNotes ?? []).map((note) => ({
    imageIndex: note.imageIndex,
    imageRole: note.imageRole,
    details: note.details?.trim() || '',
    flavorsRead: uniqueLabels(note.flavorsRead ?? []),
    textBlocksRead: uniqueLabels(note.textBlocksRead ?? []),
  }));

  // Deep per-image pass — analyze every uploaded photo (brand cases, charts, hero shots)
  const perImageAnalysis: SingleImageAnalysis[] = [];
  for (let index = 0; index < images.length; index += 1) {
    const single = await analyzeSingleProductImage(images[index], index + 1);
    if (single) perImageAnalysis.push(single);
  }

  const photoFlavorLabels = collectPhotoFlavors(
    overview.flavorOrVariantLabels ?? [],
    overviewNotes,
    perImageAnalysis
  );

  const detectedBrand =
    overview.detectedBrand?.trim() ||
    perImageAnalysis.find((item) => item.brandName)?.brandName;
  const detectedEdition =
    overview.detectedEdition?.trim() ||
    perImageAnalysis.find((item) => item.edition)?.edition;

  const kitContents = mergeKitContents(
    overview.kitContents ?? [],
    perImageAnalysis.flatMap((item) => item.kitItemsVisible)
  );

  const brandResearch = await researchBrandProductRelease({
    detectedBrand,
    detectedProductName: overview.detectedProductName,
    detectedEdition,
    category: input.category,
    photoFlavors: photoFlavorLabels,
    kitContents,
    packagingSummary: overview.packagingSummary,
    perImageFlavorReads: [
      ...overviewNotes.map((n) => n.flavorsRead ?? []),
      ...perImageAnalysis.map((i) => i.flavorLabelsRead),
    ],
  });

  const { merged: flavorOrVariantLabels, notes: flavorMergeNotes } = mergeFlavorLists(
    photoFlavorLabels,
    brandResearch?.authenticFlavorList ?? []
  );

  const kitContentsFinal = mergeKitContents(
    kitContents,
    brandResearch?.kitContentsOfficial ?? []
  );

  const detectedProductName = pickBestProductName(overview.detectedProductName, brandResearch);

  const optionGroupLayout = resolveOptionLayout(
    overview.optionGroupLayout ?? 'none',
    input.category ?? '',
    flavorOrVariantLabels.length > 0,
    overview.packagingSummary ?? ''
  );

  const confidenceRank = { high: 3, medium: 2, low: 1 };
  const confidences = [
    overview.confidence ?? 'medium',
    ...perImageAnalysis.map((item) => item.confidence),
    brandResearch?.confidence,
  ].filter(Boolean) as Array<'high' | 'medium' | 'low'>;
  const overallConfidence = confidences.reduce<'high' | 'medium' | 'low'>(
    (lowest, current) => (confidenceRank[current] < confidenceRank[lowest] ? current : lowest),
    'high'
  );

  return {
    detectedProductName,
    detectedBrand: brandResearch?.brandName ?? detectedBrand,
    detectedEdition: brandResearch?.edition ?? detectedEdition,
    kitContents: kitContentsFinal,
    packagingSummary: overview.packagingSummary?.trim() || '',
    photoFlavorLabels,
    flavorOrVariantLabels,
    flavorMergeNotes,
    brandResearch: brandResearch ?? undefined,
    optionGroupLayout,
    sizeOptions: uniqueLabels(overview.sizeOptions ?? []),
    fullBoxLabel: overview.fullBoxLabel?.trim() || undefined,
    singleUnitLabel: overview.singleUnitLabel?.trim() || undefined,
    modelOptions: uniqueLabels(overview.modelOptions ?? []),
    colorOptions: uniqueLabels(overview.colorOptions ?? []),
    visualHighlights: uniqueLabels(overview.visualHighlights ?? []),
    perImageNotes: overviewNotes,
    perImageAnalysis,
    confidence: overallConfidence,
  };
}