import { isXaiConfigured, xaiChatCompletion } from '@/lib/xai';

export interface BrandReleaseResearch {
  brandName: string;
  productLine: string;
  edition?: string;
  officialProductName?: string;
  authenticFlavorList: string[];
  authenticReleaseName?: string;
  kitContentsOfficial: string[];
  releaseNotes: string;
  crossReferenceSummary: string;
  confidence: 'high' | 'medium' | 'low';
}

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

/** Normalize brand token for fuzzy matching (WHOLEMELTS vs Whole Melts). */
export function normalizeBrandKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function flavorKeysMatch(a: string, b: string): boolean {
  const na = normalizeBrandKey(a);
  const nb = normalizeBrandKey(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Merge photo-read flavors (priority spelling) with brand-database flavors (fill gaps).
 */
export function mergeFlavorLists(
  photoFlavors: string[],
  brandFlavors: string[]
): { merged: string[]; addedFromBrand: string[]; notes: string } {
  const merged = uniqueLabels(photoFlavors);
  const addedFromBrand: string[] = [];

  for (const brandFlavor of uniqueLabels(brandFlavors)) {
    const alreadyListed = merged.some((photo) => flavorKeysMatch(photo, brandFlavor));
    if (!alreadyListed) {
      merged.push(brandFlavor);
      addedFromBrand.push(brandFlavor);
    }
  }

  const notes =
    addedFromBrand.length > 0
      ? `Added ${addedFromBrand.length} flavor(s) from brand cross-reference: ${addedFromBrand.join(', ')}`
      : photoFlavors.length > 0
        ? 'All flavors matched photo OCR; brand list confirmed spelling.'
        : brandFlavors.length > 0
          ? 'Flavor list sourced from brand cross-reference (limited photo OCR).'
          : 'No flavors confirmed from photos or brand research.';

  return { merged, addedFromBrand, notes };
}

export async function researchBrandProductRelease(input: {
  detectedBrand?: string;
  detectedProductName: string;
  detectedEdition?: string;
  category?: string;
  photoFlavors: string[];
  kitContents: string[];
  packagingSummary?: string;
  perImageFlavorReads?: string[][];
}): Promise<BrandReleaseResearch | null> {
  if (!isXaiConfigured()) return null;

  const brandHint = input.detectedBrand?.trim() || input.detectedProductName;
  const reply = await xaiChatCompletion({
    temperature: 0.1,
    max_tokens: 1800,
    messages: [
      {
        role: 'system',
        content: `You are a hemp/cannabis product catalog researcher for Kush World shop admin.
Cross-reference AUTHENTIC official brand releases and flavor menus from:
- Brand packaging conventions and known product lines
- Public brand social posts, official drop announcements
- Dispensary/wholesale menus that list full flavor runs
- Strain database sites for branded collab names

Return valid JSON only. Use exact official flavor spellings when known.
Known brand families (match aliases):
- WHOLEMELTS / Whole Melts / WholeMeltz — Passport boxes, Badder editions, disposable lines
- Stoner Stix — disposable + pre-roll kits, themed editions (Gamer Edition, etc.)
- Arcadia — concentrate boxes with strain charts
- Muha Meds, Cali Clear, Cookies collabs, etc.

Do NOT invent flavors. If uncertain, return fewer items with lower confidence.`,
      },
      {
        role: 'user',
        content: `Research the authentic release for this product listing:

Product name from photos/admin: ${input.detectedProductName}
Brand hint: ${brandHint}
Edition: ${input.detectedEdition || 'unknown'}
Category: ${input.category || 'unknown'}
Kit contents seen in photos: ${input.kitContents.join(', ') || 'unknown'}
Packaging summary: ${input.packagingSummary || 'n/a'}
Flavors read from product photos (OCR — verify/correct against official brand list):
${input.photoFlavors.length ? input.photoFlavors.map((f) => `- ${f}`).join('\n') : '- none read from photos yet'}
${
  input.perImageFlavorReads?.length
    ? `\nPer-image flavor reads:\n${input.perImageFlavorReads
        .map((reads, i) => `Image ${i + 1}: ${reads.join(', ') || 'none'}`)
        .join('\n')}`
    : ''
}

Tasks:
1. Identify the real brand and product line (e.g. "Stoner Stix Gamer Edition", "WHOLEMELTS Passport").
2. Return the COMPLETE authentic flavor/variant list for this specific release if publicly documented.
3. Correct OCR typos in photo reads using official spellings (e.g. "Lemon Pickachuze" → keep photo spelling only if official unknown).
4. Note official kit contents (vape + pre-roll, full box jar count, etc.).

Return JSON:
{
  "brandName": "official brand name",
  "productLine": "product line name",
  "edition": "edition if any",
  "officialProductName": "full retail product title",
  "authenticReleaseName": "drop/collection name if known",
  "authenticFlavorList": ["every official flavor for THIS release"],
  "kitContentsOfficial": ["official included items"],
  "releaseNotes": "1-3 sentences about this release",
  "crossReferenceSummary": "how you matched this release and flavor list",
  "confidence": "high | medium | low"
}`,
      },
    ],
  });

  const parsed = parseJsonFromReply<BrandReleaseResearch>(reply);
  if (!parsed?.brandName || !parsed.productLine) return null;

  return {
    brandName: parsed.brandName.trim(),
    productLine: parsed.productLine.trim(),
    edition: parsed.edition?.trim() || undefined,
    officialProductName: parsed.officialProductName?.trim() || undefined,
    authenticReleaseName: parsed.authenticReleaseName?.trim() || undefined,
    authenticFlavorList: uniqueLabels(parsed.authenticFlavorList ?? []),
    kitContentsOfficial: uniqueLabels(parsed.kitContentsOfficial ?? []),
    releaseNotes: parsed.releaseNotes?.trim() || '',
    crossReferenceSummary: parsed.crossReferenceSummary?.trim() || '',
    confidence: parsed.confidence ?? 'medium',
  };
}

export function formatBrandResearchForPrompt(research: BrandReleaseResearch): string {
  return [
    'BRAND CROSS-REFERENCE (authentic release + official flavor list — prefer over guesses):',
    `- Brand: ${research.brandName}`,
    `- Product line: ${research.productLine}`,
    research.edition ? `- Edition: ${research.edition}` : '',
    research.officialProductName ? `- Official product name: ${research.officialProductName}` : '',
    research.authenticReleaseName ? `- Release: ${research.authenticReleaseName}` : '',
    research.authenticFlavorList.length
      ? `- Official flavors (${research.authenticFlavorList.length}): ${research.authenticFlavorList.join(', ')}`
      : '',
    research.kitContentsOfficial.length
      ? `- Official kit contents: ${research.kitContentsOfficial.join(', ')}`
      : '',
    research.releaseNotes ? `- Release notes: ${research.releaseNotes}` : '',
    `- Cross-reference: ${research.crossReferenceSummary}`,
    `- Brand research confidence: ${research.confidence}`,
  ]
    .filter(Boolean)
    .join('\n');
}