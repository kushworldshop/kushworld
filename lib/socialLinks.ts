import type { SiteContent } from '@/lib/siteContentTypes';

export type SocialUrlKey = Exclude<keyof SiteContent['social'], 'twitterHandle'>;

export interface SocialLinkDef {
  key: SocialUrlKey;
  label: string;
  icon: string;
  brand?: boolean;
}

export const SOCIAL_LINK_ORDER: SocialLinkDef[] = [
  { key: 'discordUrl', label: 'Discord', icon: 'fa-discord', brand: true },
  { key: 'studioUrl', label: 'Kush World Studio', icon: 'fa-shirt' },
  { key: 'twitterUrl', label: 'X', icon: 'fa-x-twitter', brand: true },
  { key: 'tiktokUrl', label: 'TikTok', icon: 'fa-tiktok', brand: true },
  { key: 'facebookUrl', label: 'Facebook', icon: 'fa-facebook', brand: true },
  { key: 'whatsappUrl', label: 'WhatsApp', icon: 'fa-whatsapp', brand: true },
  { key: 'instagramUrl', label: 'Instagram', icon: 'fa-instagram', brand: true },
  { key: 'twitchUrl', label: 'Twitch', icon: 'fa-twitch', brand: true },
  { key: 'linktreeUrl', label: 'Linktree', icon: 'fa-linktree', brand: true },
];

export function getActiveSocialLinks(social: SiteContent['social']) {
  return SOCIAL_LINK_ORDER.map((def) => ({
    ...def,
    url: social[def.key],
  })).filter((link) => link.url.trim());
}

export function getOrganizationSameAs(social: SiteContent['social']): string[] {
  return getActiveSocialLinks(social).map((link) => link.url);
}