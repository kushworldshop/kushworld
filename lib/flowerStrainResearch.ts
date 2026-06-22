import fs from 'fs/promises';
import path from 'path';
import { isXaiConfigured, xaiChatCompletion, xaiVisionJson } from '@/lib/xai';

export interface FlowerStrainImageAnalysis {
  budAppearance: string;
  colorNotes: string;
  trichomeNotes: string;
  trimQuality: string;
  visualHighlights: string[];
}

export interface FlowerStrainResearchedProfile {
  strainType: string;
  lineage?: string;
  parentStrains?: string[];
  aromaFlavorNotes: string[];
  terpeneHighlights?: string[];
  confidence: 'high' | 'medium' | 'low' | 'proprietary';
  notes: string;
}

export interface FlowerStrainContext {
  strainName: string;
  productName: string;
  variantHints: string[];
  imageAnalysis?: FlowerStrainImageAnalysis;
  researchedProfile?: FlowerStrainResearchedProfile;
}

const VARIANT_SUFFIXES = [
  /\s*-\s*INDOOR\s*SMALLS$/i,
  /\s*INDOOR\s*SMALLS$/i,
  /\s*-\s*SMALLS$/i,
  /\s*SMALLS$/i,
  /\s*-\s*INDOOR$/i,
  /\s*INDOOR$/i,
];

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

async function readLocalProductImage(
  imagePath: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!imagePath.startsWith('/')) return null;

  const ext = path.extname(imagePath).toLowerCase();
  const mimeType =
    ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : null;
  if (!mimeType) return null;

  const filePath = path.join(process.cwd(), 'public', imagePath.replace(/^\//, ''));
  try {
    const buffer = await fs.readFile(filePath);
    return { buffer, mimeType };
  } catch {
    return null;
  }
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

export async function analyzeFlowerProductImage(
  imagePath: string
): Promise<FlowerStrainImageAnalysis | null> {
  const file = await readLocalProductImage(imagePath);
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
  });
}

export async function researchFlowerStrainProfile(input: {
  strainName: string;
  variantHints: string[];
  imageAnalysis?: FlowerStrainImageAnalysis;
}): Promise<FlowerStrainResearchedProfile | null> {
  if (!isXaiConfigured()) return null;

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

Instructions:
- Match exact names and common aliases (e.g. "Candy Gruntz" may relate to Runtz/Gushers lineage; "White Truffz" → White Truffle).
- For house/branded cuts (BL3, proprietary names), note closest known relatives if any, else mark proprietary.
- Use sensory aroma/flavor language only — no medical or effect claims.
- Terpene highlights are optional; only include if commonly reported for this strain name.

Return JSON:
{
  "strainType": "indica | sativa | hybrid | indica-leaning hybrid | sativa-leaning hybrid | unknown",
  "lineage": "parent cross if known",
  "parentStrains": ["Parent A", "Parent B"],
  "aromaFlavorNotes": ["sweet", "earthy", "gas", ...],
  "terpeneHighlights": ["caryophyllene", "limonene", ...],
  "confidence": "high | medium | low | proprietary",
  "notes": "1-2 sentences for a copywriter — include alias matches or why data is limited"
}`,
      },
    ],
  });

  const parsed = parseJsonFromReply<FlowerStrainResearchedProfile>(reply);
  if (!parsed?.strainType) return null;

  return {
    strainType: parsed.strainType,
    lineage: parsed.lineage?.trim() || undefined,
    parentStrains: parsed.parentStrains?.filter(Boolean),
    aromaFlavorNotes: parsed.aromaFlavorNotes?.filter(Boolean) ?? [],
    terpeneHighlights: parsed.terpeneHighlights?.filter(Boolean),
    confidence: parsed.confidence ?? 'low',
    notes: parsed.notes?.trim() || '',
  };
}

export function formatFlowerStrainContextForPrompt(ctx: FlowerStrainContext): string {
  const lines: string[] = [
    'STRAIN RESEARCH (from product name, photo analysis, and public strain databases — use in copy):',
    `- Strain name: ${ctx.strainName}`,
    `- Full product name: ${ctx.productName}`,
  ];

  if (ctx.variantHints.length > 0) {
    lines.push(`- Variant / tier: ${ctx.variantHints.join(', ')}`);
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
      `- Database cross-reference (${profile.confidence} confidence):`,
      `  • Type: ${profile.strainType}`
    );
    if (profile.lineage) lines.push(`  • Lineage: ${profile.lineage}`);
    if (profile.parentStrains?.length) {
      lines.push(`  • Parents: ${profile.parentStrains.join(' × ')}`);
    }
    if (profile.aromaFlavorNotes.length) {
      lines.push(`  • Aroma / flavor notes: ${profile.aromaFlavorNotes.join(', ')}`);
    }
    if (profile.terpeneHighlights?.length) {
      lines.push(`  • Terpene highlights: ${profile.terpeneHighlights.join(', ')}`);
    }
    if (profile.notes) lines.push(`  • Research notes: ${profile.notes}`);
  }

  lines.push(
    '',
    'FLOWER COPY RULES (when strain research is provided):',
    '- Weave lineage, aroma/flavor, and visual cues naturally into the description.',
    '- Use compliant sensory language only — no medical claims, no guaranteed effects, no potency % unless in product data.',
    '- Mention indoor/smalls tier when variant hints include it.',
    '- Do not contradict the research; if confidence is low/proprietary, lean on photo details and general premium flower language.'
  );

  return lines.join('\n');
}

export async function buildFlowerStrainContext(input: {
  productName: string;
  imageUrl?: string;
}): Promise<FlowerStrainContext> {
  const { strainName, variantHints } = parseFlowerStrainFromProductName(input.productName);

  const imageAnalysis = input.imageUrl
    ? (await analyzeFlowerProductImage(input.imageUrl)) ?? undefined
    : undefined;

  const researchedProfile =
    (await researchFlowerStrainProfile({ strainName, variantHints, imageAnalysis })) ?? undefined;

  return {
    strainName,
    productName: input.productName,
    variantHints,
    imageAnalysis,
    researchedProfile,
  };
}