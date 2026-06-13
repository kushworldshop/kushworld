export type ProductDescriptionTone = 'tvn' | 'premium' | 'friendly' | 'concise';

export const PRODUCT_DESCRIPTION_TONES: {
  id: ProductDescriptionTone;
  label: string;
  hint: string;
}[] = [
  {
    id: 'tvn',
    label: 'TVN-style',
    hint: 'Professional, lab-focused, trustworthy — like TVN Family',
  },
  {
    id: 'premium',
    label: 'Premium',
    hint: 'Elevated, refined, luxury hemp retail voice',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    hint: 'Warm, approachable, conversational but still compliant',
  },
  {
    id: 'concise',
    label: 'Concise',
    hint: 'Short and punchy — ~80–120 words, feature-led',
  },
];

export const DEFAULT_PRODUCT_DESCRIPTION_TONE: ProductDescriptionTone = 'tvn';

export function normalizeProductDescriptionTone(tone: unknown): ProductDescriptionTone {
  if (typeof tone === 'string' && PRODUCT_DESCRIPTION_TONES.some((item) => item.id === tone)) {
    return tone as ProductDescriptionTone;
  }
  return DEFAULT_PRODUCT_DESCRIPTION_TONE;
}

export function getProductDescriptionToneInstructions(tone: ProductDescriptionTone): string {
  switch (tone) {
    case 'premium':
      return 'TONE: Premium and elevated — refined language, understated confidence, artisan quality. Still compliant; no hype or medical claims.';
    case 'friendly':
      return 'TONE: Warm and approachable — conversational but professional. Sound like a knowledgeable friend, not a salesperson. Still compliant.';
    case 'concise':
      return 'TONE: Concise and direct — target 80–120 words. Lead with the strongest benefit, then 3–4 tight bullet features. No filler.';
    case 'tvn':
    default:
      return 'TONE: Professional, trustworthy, premium — similar to TVN Family and other lab-focused compliant hemp brands.';
  }
}