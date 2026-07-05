import { isXaiConfigured, xaiChatCompletion } from '@/lib/xai';

export interface StrainLineageEntry {
  strainName: string;
  strainType?: string;
  lineage?: string;
  parentStrains?: string[];
  confidence: 'high' | 'medium' | 'low' | 'proprietary';
  notes?: string;
}

function parseJsonFromReply<T>(reply: string | null): T | null {
  if (!reply) return null;
  try {
    return JSON.parse(reply) as T;
  } catch {
    const match = reply.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function formatStrainCross(entry: StrainLineageEntry): string | null {
  if (entry.parentStrains && entry.parentStrains.length >= 2) {
    return entry.parentStrains.join(' × ');
  }
  if (entry.parentStrains?.length === 1 && entry.lineage) {
    return entry.lineage;
  }
  if (entry.lineage?.trim()) {
    return entry.lineage.trim();
  }
  return null;
}

export function formatStrainLineageBullet(entry: StrainLineageEntry): string {
  const cross = formatStrainCross(entry);
  if (cross && entry.confidence !== 'proprietary') {
    return `• ${entry.strainName} (${cross})`;
  }
  return `• ${entry.strainName}`;
}

export function formatStrainLineageRosterForPrompt(entries: StrainLineageEntry[]): string {
  if (entries.length === 0) return '';

  const lines = [
    'STRAIN LINEAGE ROSTER (cross-referenced from public strain databases — required for closing list):',
    'Format each entry exactly as it should appear in the shop description closing section.',
    '',
  ];

  for (const entry of entries) {
    const cross = formatStrainCross(entry);
    const typePart = entry.strainType ? `, ${entry.strainType}` : '';
    const confPart = `, ${entry.confidence} confidence`;
    if (cross && entry.confidence !== 'proprietary') {
      lines.push(`- ${entry.strainName} → (${cross})${typePart}${confPart}`);
    } else {
      lines.push(`- ${entry.strainName} → name only (no verified cross)${typePart}${confPart}`);
    }
    if (entry.notes) lines.push(`  Note: ${entry.notes}`);
  }

  lines.push(
    '',
    'DESCRIPTION CLOSING (REQUIRED when this roster is present):',
    '- End the description with a short closing section titled "Available strains:" (or "Available flavors:" for themed vape kits).',
    '- List EVERY strain/flavor from the roster using bullet lines with "•".',
    '- When a cross is shown above, format: • Strain Name (Parent A × Parent B)',
    '- When no verified cross exists, list: • Strain Name (no parentheses).',
    '- Use exact strain names from the roster — do not rename, abbreviate, or invent genetics.',
    '- Do not repeat the full list earlier in the body; weave 1–2 highlight strains in the intro if helpful, then put the complete roster at the end.'
  );

  return lines.join('\n');
}

export async function researchMultiStrainLineages(
  strainNames: string[]
): Promise<StrainLineageEntry[]> {
  if (!isXaiConfigured() || strainNames.length === 0) return [];

  const unique = [...new Map(strainNames.map((name) => [normalizeKey(name), name.trim()])).values()].filter(
    Boolean
  );

  if (unique.length === 0) return [];

  const reply = await xaiChatCompletion({
    temperature: 0.1,
    max_tokens: 2800,
    messages: [
      {
        role: 'system',
        content:
          'You research hemp/cannabis strain genetics by cross-referencing Leafly, AllBud, SeedFinder, strain wiki sites, and brand drop menus. Return valid JSON only.',
      },
      {
        role: 'user',
        content: `Cross-reference parent strain crosses for EACH name below. These appear on a multi-strain product (e.g. WHOLEMELTS Caviar box, Passport, concentrate variety box).

Strain names to research (${unique.length}):
${unique.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Instructions:
- Match aliases and branded cuts (e.g. "Candy Fumez" → Apple Fritter × Lemon Tree; "Zereal" → Cereal Milk crosses).
- For house/proprietary cuts with no public cross, set confidence "proprietary" and omit parentStrains.
- Use Parent A × Parent B format in parentStrains array when known.
- Return one entry per input name, same strainName spelling as input.

Return JSON array:
[
  {
    "strainName": "exact input name",
    "strainType": "indica | sativa | hybrid | unknown",
    "lineage": "Parent A × Parent B",
    "parentStrains": ["Parent A", "Parent B"],
    "confidence": "high | medium | low | proprietary",
    "notes": "optional brief note for copywriter"
  }
]`,
      },
    ],
  });

  const parsed = parseJsonFromReply<StrainLineageEntry[]>(reply);
  if (!Array.isArray(parsed)) return [];

  const byKey = new Map<string, StrainLineageEntry>();
  for (const item of parsed) {
    if (!item?.strainName?.trim()) continue;
    byKey.set(normalizeKey(item.strainName), {
      strainName: item.strainName.trim(),
      strainType: item.strainType?.trim() || undefined,
      lineage: item.lineage?.trim() || undefined,
      parentStrains: item.parentStrains?.map((p) => p.trim()).filter(Boolean),
      confidence: item.confidence ?? 'low',
      notes: item.notes?.trim() || undefined,
    });
  }

  return unique.map(
    (name) =>
      byKey.get(normalizeKey(name)) ?? {
        strainName: name,
        confidence: 'proprietary' as const,
      }
  );
}

export function categoriesWithStrainRoster(category?: string): boolean {
  const normalized = category?.toLowerCase().trim() ?? '';
  return ['concentrates', 'moonrocks', 'flower', 'pre-rolls', 'edibles'].includes(normalized);
}