import { loadProductImageBytes } from '@/lib/productImageIO';
import {
  isXaiConfigured,
  xaiChatCompletion,
  xaiResponsesWithTools,
  xaiVisionJson,
} from '@/lib/xai';

export interface FlowerStrainImageAnalysis {
  budAppearance: string;
  colorNotes: string;
  trichomeNotes: string;
  trimQuality: string;
  visualHighlights: string[];
}

export interface FlowerStrainSourceInsight {
  sourceType: 'web' | 'x' | 'news' | 'database';
  summary: string;
  topic?: string;
}

export interface FlowerStrainResearchedProfile {
  strainType: string;
  lineage?: string;
  parentStrains?: string[];
  aromaFlavorNotes: string[];
  terpeneHighlights?: string[];
  aliasNames?: string[];
  breederInfo?: string;
  socialBuzz?: string;
  newsNotes?: string;
  sourceInsights?: FlowerStrainSourceInsight[];
  citations?: string[];
  confidence: 'high' | 'medium' | 'low' | 'proprietary';
  notes: string;
}

export interface FlowerStrainContext {
  strainName: string;
  productName: string;
  variantHints: string[];
  photoStrainNames: string[];
  imageAnalysis?: FlowerStrainImageAnalysis;
  researchedProfile?: FlowerStrainResearchedProfile;
}

/** Shop badge metadata derived from strain research (ProductMetaBadges on storefront). */
export interface FlowerProductMetadata {
  strainType?: string;
  tier?: string;
  effects?: string[];
  subcategory?: string;
}

const EFFECT_INFERENCE_KEYWORDS: Record<string, string[]> = {
  relax: ['relax', 'sleep', 'calm', 'couch', 'indica', 'earth', 'earthy'],
  focus: ['focus', 'alert', 'productive', 'clear'],
  social: ['social', 'talkative', 'party', 'uplifting'],
  relief: ['relief', 'comfort', 'soothe', 'body'],
  creative: ['creative', 'inspire', 'artistic'],
  energy: ['energy', 'active', 'sativa', 'daytime', 'citrus', 'lemon', 'lime', 'diesel', 'pinene'],
  euphoric: ['euphoric', 'happy', 'mood', 'giggly', 'candy', 'sweet', 'berry', 'vanilla', 'cherry'],
};

const VARIANT_SUFFIXES = [
  /\s*-\s*INDOOR\s*SMALLS$/i,
  /\s*INDOOR\s*SMALLS$/i,
  /\s*-\s*SMALLS$/i,
  /\s*SMALLS$/i,
  /\s*-\s*INDOOR$/i,
  /\s*INDOOR$/i,
];

const STRAIN_RESEARCH_SYSTEM_PROMPT = `You are a hemp/cannabis strain researcher for Kush World shop admin.
Use web_search and x_search to cross-reference REAL public information before answering.
Prioritize: Leafly, AllBud, SeedFinder, Hytiva, Wikileaf, breeder pages, dispensary menus, hemp/THCA flower retailers, cannabis news outlets, and X posts from growers/breeders/reviewers.
Return valid JSON only — no markdown fences, no preamble.
Use compliant sensory language only — no medical claims, no guaranteed effects, no invented THC/CBD percentages.`;

export function isFlowerProductCategory(category?: string): boolean {
  return category?.toLowerCase().trim() === 'flower';
}

export function parseFlowerStrainFromProductName(productName: string): {
  strainName: string;
  variantHints: string[];
} {
  let name = productName.trim();
  const variantHints: string[] = [];

  for (const pattern of VARIANT_SUFFIXES) {
    const match = name.match(pattern);
    if (match) {
      const hint = match[0].replace(/^\s*-\s*/, '').trim();
      if (hint && !variantHints.some((h) => h.toLowerCase() === hint.toLowerCase())) {
        variantHints.push(hint);
      }
      name = name.replace(pattern, '').trim();
    }
  }

  return {
    strainName: name.replace(/\s*-\s*$/, '').trim() || productName.trim(),
    variantHints,
  };
}

function normalizeStrainKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function uniqueStrainNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const cleaned = name.trim();
    if (!cleaned) continue;
    const key = normalizeStrainKey(cleaned);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
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

function normalizeResearchedProfile(
  parsed: Partial<FlowerStrainResearchedProfile> | null,
  citations: string[]
): FlowerStrainResearchedProfile | null {
  if (!parsed?.strainType?.trim()) return null;

  return {
    strainType: parsed.strainType.trim(),
    lineage: parsed.lineage?.trim() || undefined,
    parentStrains: parsed.parentStrains?.map((p) => p.trim()).filter(Boolean),
    aromaFlavorNotes: parsed.aromaFlavorNotes?.map((n) => n.trim()).filter(Boolean) ?? [],
    terpeneHighlights: parsed.terpeneHighlights?.map((t) => t.trim()).filter(Boolean),
    aliasNames: parsed.aliasNames?.map((a) => a.trim()).filter(Boolean),
    breederInfo: parsed.breederInfo?.trim() || undefined,
    socialBuzz: parsed.socialBuzz?.trim() || undefined,
    newsNotes: parsed.newsNotes?.trim() || undefined,
    sourceInsights: parsed.sourceInsights
      ?.filter((item) => item?.summary?.trim())
      .map((item) => ({
        sourceType: item.sourceType ?? 'web',
        summary: item.summary.trim(),
        topic: item.topic?.trim() || undefined,
      })),
    citations: citations.length > 0 ? citations : undefined,
    confidence: parsed.confidence ?? 'low',
    notes: parsed.notes?.trim() || '',
  };
}

function buildFlowerResearchPrompt(input: {
  strainName: string;
  variantHints: string[];
  photoStrainNames: string[];
  imageAnalysis?: FlowerStrainImageAnalysis;
}): string {
  const allNames = uniqueStrainNames([
    input.strainName,
    ...input.photoStrainNames.filter((n) => normalizeStrainKey(n) !== normalizeStrainKey(input.strainName)),
  ]);

  return `Deep-research this hemp flower strain for a Kush World product listing.

PRIMARY STRAIN: "${input.strainName}"
${input.variantHints.length ? `Menu tier / variant on our site: ${input.variantHints.join(', ')}` : ''}
${allNames.length > 1 ? `Also seen on packaging/photos: ${allNames.slice(1).join(', ')}` : ''}
${input.imageAnalysis ? `Our uploaded product photo analysis:\n${JSON.stringify(input.imageAnalysis, null, 2)}` : ''}

RESEARCH TASKS (use web_search AND x_search):
1. WEB — Find genetics/lineage on strain databases (Leafly, AllBud, SeedFinder, Hytiva, Wikileaf). Note breeder if known.
2. X — Search posts about this strain name: grower drops, pheno hunts, hemp/THCA flower reviews, flavor talk. Summarize community consensus (no hype).
3. NEWS / SOCIAL WEB — Check cannabis/hemp news, breeder announcements, or menu features mentioning this strain.
4. ALIASES — Match spelling variants (e.g. "White Truffz" → White Truffle; "Candy Gruntz" → Runtz family).
5. CROSS-REFERENCE — Only include facts that appear in multiple sources or a trusted breeder/database. Mark proprietary house cuts when no public genetics exist.

Return JSON:
{
  "strainType": "indica | sativa | hybrid | indica-leaning hybrid | sativa-leaning hybrid | unknown",
  "lineage": "Parent A × Parent B if verified",
  "parentStrains": ["Parent A", "Parent B"],
  "aromaFlavorNotes": ["sweet", "gas", "earthy", ...],
  "terpeneHighlights": ["caryophyllene", "limonene", ...],
  "aliasNames": ["other spellings or names found"],
  "breederInfo": "breeder/seed bank if known",
  "socialBuzz": "2-3 sentences summarizing X/community discussion — sensory and reputation only",
  "newsNotes": "brief note if strain appears in news or major drops; else empty string",
  "sourceInsights": [
    { "sourceType": "web | x | news | database", "topic": "lineage | aroma | breeder | reviews", "summary": "one sentence fact from that source type" }
  ],
  "confidence": "high | medium | low | proprietary",
  "notes": "1-3 sentences for copywriter: alias matches, data gaps, what to emphasize"
}`;
}

async function researchFlowerStrainProfileFallback(input: {
  strainName: string;
  variantHints: string[];
  imageAnalysis?: FlowerStrainImageAnalysis;
}): Promise<FlowerStrainResearchedProfile | null> {
  const reply = await xaiChatCompletion({
    temperature: 0.15,
    max_tokens: 550,
    messages: [
      {
        role: 'system',
        content:
          'You research hemp/cannabis strain profiles by cross-referencing public strain databases (Leafly, AllBud, SeedFinder, strain review sites). Return valid JSON only — no markdown.',
      },
      {
        role: 'user',
        content: `Cross-reference public strain data for: "${input.strainName}"
${input.variantHints.length ? `Product variant on our menu: ${input.variantHints.join(', ')}` : ''}
${input.imageAnalysis ? `Our product photo analysis:\n${JSON.stringify(input.imageAnalysis, null, 2)}` : ''}

Return JSON with strainType, lineage, parentStrains, aromaFlavorNotes, terpeneHighlights, confidence, notes.`,
      },
    ],
  });

  return normalizeResearchedProfile(parseJsonFromReply<FlowerStrainResearchedProfile>(reply), []);
}

export async function analyzeFlowerProductImage(
  imagePath: string
): Promise<FlowerStrainImageAnalysis | null> {
  const file = await loadProductImageBytes(imagePath);
  if (!file || !isXaiConfigured()) return null;

  return xaiVisionJson<FlowerStrainImageAnalysis>({
    prompt: `Analyze this hemp/cannabis flower product photo for e-commerce SEO copy.
Return JSON only:
{
  "budAppearance": "1 sentence on bud structure and density",
  "colorNotes": "visible greens, purples, pistils, sugar leaves",
  "trichomeNotes": "frost / trichome coverage",
  "trimQuality": "trim and manicure quality",
  "visualHighlights": ["3-5 short visual selling points shoppers notice"]
}
Describe only what is visible. No potency or THC claims.`,
    imageBase64: file.buffer.toString('base64'),
    mimeType: file.mimeType,
    detail: 'high',
    max_tokens: 400,
  });
}

export async function researchFlowerStrainProfile(input: {
  strainName: string;
  variantHints: string[];
  photoStrainNames?: string[];
  imageAnalysis?: FlowerStrainImageAnalysis;
}): Promise<FlowerStrainResearchedProfile | null> {
  if (!isXaiConfigured()) return null;

  const photoStrainNames = input.photoStrainNames ?? [];

  const agentResult = await xaiResponsesWithTools({
    systemPrompt: STRAIN_RESEARCH_SYSTEM_PROMPT,
    input: buildFlowerResearchPrompt({
      strainName: input.strainName,
      variantHints: input.variantHints,
      photoStrainNames,
      imageAnalysis: input.imageAnalysis,
    }),
    tools: [{ type: 'web_search' }, { type: 'x_search' }],
    max_output_tokens: 2400,
    timeoutMs: 120_000,
  });

  if (agentResult) {
    const profile = normalizeResearchedProfile(
      parseJsonFromReply<FlowerStrainResearchedProfile>(agentResult.text),
      agentResult.citations
    );
    if (profile) return profile;
  }

  return researchFlowerStrainProfileFallback(input);
}

export function formatFlowerStrainContextForPrompt(ctx: FlowerStrainContext): string {
  const lines: string[] = [
    'FLOWER STRAIN RESEARCH (product name, uploaded photos, web + X + news cross-reference — use in copy):',
    `- Strain name: ${ctx.strainName}`,
    `- Full product name: ${ctx.productName}`,
  ];

  if (ctx.variantHints.length > 0) {
    lines.push(`- Variant / tier: ${ctx.variantHints.join(', ')}`);
  }

  if (ctx.photoStrainNames.length > 0) {
    lines.push(`- Strain names read from uploaded photos: ${ctx.photoStrainNames.join(', ')}`);
  }

  if (ctx.imageAnalysis) {
    lines.push(
      '- Photo analysis:',
      `  • Appearance: ${ctx.imageAnalysis.budAppearance}`,
      `  • Colors: ${ctx.imageAnalysis.colorNotes}`,
      `  • Trichomes: ${ctx.imageAnalysis.trichomeNotes}`,
      `  • Trim: ${ctx.imageAnalysis.trimQuality}`,
      `  • Visual highlights: ${ctx.imageAnalysis.visualHighlights.join('; ')}`
    );
  }

  if (ctx.researchedProfile) {
    const profile = ctx.researchedProfile;
    lines.push(
      `- Deep research cross-reference (${profile.confidence} confidence, ${profile.citations?.length ?? 0} source URLs):`,
      `  • Type: ${profile.strainType}`
    );
    if (profile.lineage) lines.push(`  • Lineage: ${profile.lineage}`);
    if (profile.parentStrains?.length) {
      lines.push(`  • Parents: ${profile.parentStrains.join(' × ')}`);
    }
    if (profile.aliasNames?.length) {
      lines.push(`  • Aliases found: ${profile.aliasNames.join(', ')}`);
    }
    if (profile.breederInfo) lines.push(`  • Breeder: ${profile.breederInfo}`);
    if (profile.aromaFlavorNotes.length) {
      lines.push(`  • Aroma / flavor notes: ${profile.aromaFlavorNotes.join(', ')}`);
    }
    if (profile.terpeneHighlights?.length) {
      lines.push(`  • Terpene highlights: ${profile.terpeneHighlights.join(', ')}`);
    }
    if (profile.socialBuzz) lines.push(`  • X / community buzz: ${profile.socialBuzz}`);
    if (profile.newsNotes) lines.push(`  • News / industry notes: ${profile.newsNotes}`);
    if (profile.sourceInsights?.length) {
      lines.push('  • Source insights:');
      for (const insight of profile.sourceInsights.slice(0, 6)) {
        const topic = insight.topic ? ` (${insight.topic})` : '';
        lines.push(`    - [${insight.sourceType}]${topic}: ${insight.summary}`);
      }
    }
    if (profile.notes) lines.push(`  • Research notes: ${profile.notes}`);
  }

  lines.push(
    '',
    'FLOWER COPY RULES (when strain research is provided):',
    '- Weave lineage, aroma/flavor, photo visuals, and community reputation naturally into the description body.',
    '- When lineage/parents are verified, mention the cross (Parent A × Parent B) at least once.',
    '- You may reference that the strain is discussed in grower/review communities when socialBuzz supports it — stay factual, no hype.',
    '- Use compliant sensory language only — no medical claims, no guaranteed effects, no potency % unless in product data.',
    '- Mention indoor/smalls tier when variant hints include it.',
    '- Do not contradict the research; if confidence is low/proprietary, lean on photo details and premium flower language.'
  );

  return lines.join('\n');
}

export function normalizeStrainTypeLabel(strainType: string): string | undefined {
  const lower = strainType.toLowerCase().trim();
  if (!lower || lower === 'unknown') return undefined;
  if (lower.includes('indica') && lower.includes('sativa')) return 'Hybrid';
  if (lower.includes('indica')) return 'Indica';
  if (lower.includes('sativa')) return 'Sativa';
  if (lower.includes('hybrid')) return 'Hybrid';
  return strainType.trim();
}

export function inferStrainTypeFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/indica-leaning|indica leaning/.test(lower)) return 'Indica';
  if (/sativa-leaning|sativa leaning/.test(lower)) return 'Sativa';
  if (/\bhybrid\b/.test(lower)) return 'Hybrid';
  if (/\bindica\b/.test(lower) && /\bsativa\b/.test(lower)) return 'Hybrid';
  if (/\bindica\b/.test(lower)) return 'Indica';
  if (/\bsativa\b/.test(lower)) return 'Sativa';
  return undefined;
}

export function inferFlowerEffectsFromText(...textParts: Array<string | undefined>): string[] {
  const haystack = textParts.filter(Boolean).join(' ').toLowerCase();
  if (!haystack.trim()) return [];

  const scores = new Map<string, number>();
  for (const [vibeId, keywords] of Object.entries(EFFECT_INFERENCE_KEYWORDS)) {
    const hits = keywords.filter((keyword) => haystack.includes(keyword)).length;
    if (hits > 0) scores.set(vibeId, hits);
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([vibeId]) => vibeId);
}

export function inferFlowerEffects(profile?: FlowerStrainResearchedProfile): string[] {
  return inferFlowerEffectsFromText(
    ...(profile?.aromaFlavorNotes ?? []),
    profile?.strainType,
    profile?.notes,
    profile?.socialBuzz,
    profile?.lineage
  );
}

function inferFlowerTier(input: {
  productName: string;
  variantHints: string[];
  subcategory?: string;
  description?: string;
}): string | undefined {
  const nameUpper = input.productName.toUpperCase();
  const hintsUpper = input.variantHints.map((hint) => hint.toUpperCase());
  const descLower = (input.description ?? '').toLowerCase();
  const subLower = (input.subcategory ?? '').toLowerCase();

  if (
    hintsUpper.some((hint) => hint.includes('SMALL')) ||
    nameUpper.includes('SMALL') ||
    /\bsmalls\b/.test(descLower)
  ) {
    return 'Smalls';
  }
  if (hintsUpper.some((hint) => hint.includes('EXOTIC')) || nameUpper.includes('EXOTIC')) {
    return 'Exotic';
  }
  if (
    hintsUpper.some((hint) => hint.includes('INDOOR')) ||
    nameUpper.includes('INDOOR') ||
    subLower === 'indoor' ||
    /\bindoor\b/.test(descLower)
  ) {
    return 'Exotic';
  }
  return 'Exotic';
}

function inferFlowerSubcategory(input: {
  productName: string;
  variantHints: string[];
  subcategory?: string;
  description?: string;
}): string | undefined {
  const nameUpper = input.productName.toUpperCase();
  const hintsUpper = input.variantHints.map((hint) => hint.toUpperCase());
  const descLower = (input.description ?? '').toLowerCase();
  if (input.subcategory?.trim()) return input.subcategory.trim();
  if (
    hintsUpper.some((hint) => hint.includes('INDOOR')) ||
    nameUpper.includes('INDOOR') ||
    /\bindoor\b/.test(descLower)
  ) {
    return 'indoor';
  }
  return undefined;
}

export function deriveFlowerProductMetadata(
  ctx: FlowerStrainContext,
  options?: { description?: string; subcategory?: string }
): FlowerProductMetadata {
  const description = options?.description?.trim() ?? '';
  const profile = ctx.researchedProfile;
  const meta: FlowerProductMetadata = {};

  meta.strainType =
    (profile?.strainType ? normalizeStrainTypeLabel(profile.strainType) : undefined) ??
    inferStrainTypeFromText(
      [ctx.productName, description, profile?.notes, profile?.socialBuzz].filter(Boolean).join(' ')
    );

  meta.tier = inferFlowerTier({
    productName: ctx.productName,
    variantHints: ctx.variantHints,
    subcategory: options?.subcategory,
    description,
  });

  meta.subcategory = inferFlowerSubcategory({
    productName: ctx.productName,
    variantHints: ctx.variantHints,
    subcategory: options?.subcategory,
    description,
  });

  const effects = inferFlowerEffectsFromText(
    ...(profile?.aromaFlavorNotes ?? []),
    profile?.strainType,
    profile?.notes,
    profile?.socialBuzz,
    profile?.lineage,
    description
  );
  if (effects.length > 0) meta.effects = effects;

  return meta;
}

/** Always returns shop badge metadata for flower — used after every Grok description run. */
export function finalizeFlowerProductMetadata(
  ctx: FlowerStrainContext,
  options?: { description?: string; subcategory?: string }
): FlowerProductMetadata {
  const meta = deriveFlowerProductMetadata(ctx, options);

  if (!meta.strainType) meta.strainType = 'Hybrid';
  if (!meta.tier) meta.tier = 'Exotic';
  if (!meta.effects?.length) meta.effects = ['euphoric'];

  return meta;
}

export function flowerMetadataToProductFields(
  metadata: FlowerProductMetadata
): Pick<FlowerProductMetadata, 'strainType' | 'tier' | 'effects' | 'subcategory'> {
  return {
    strainType: metadata.strainType,
    tier: metadata.tier,
    effects: metadata.effects,
    subcategory: metadata.subcategory,
  };
}

export async function buildFlowerStrainContext(input: {
  productName: string;
  imageUrls?: string[];
  imageUrl?: string;
  photoStrainNames?: string[];
}): Promise<FlowerStrainContext> {
  const { strainName, variantHints } = parseFlowerStrainFromProductName(input.productName);
  const photoStrainNames = uniqueStrainNames(input.photoStrainNames ?? []);

  const primaryImage = input.imageUrls?.find(Boolean) ?? input.imageUrl;
  const imageAnalysis = primaryImage
    ? (await analyzeFlowerProductImage(primaryImage)) ?? undefined
    : undefined;

  const researchedProfile =
    (await researchFlowerStrainProfile({
      strainName,
      variantHints,
      photoStrainNames,
      imageAnalysis,
    })) ?? undefined;

  return {
    strainName,
    productName: input.productName,
    variantHints,
    photoStrainNames,
    imageAnalysis,
    researchedProfile,
  };
}