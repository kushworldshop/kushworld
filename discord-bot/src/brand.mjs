export const BRAND = {
  name: 'Kush World',
  color: 0x00ff9d,
  site: 'https://kushworld.shop',
  tagline: 'Lab-tested hemp · Studio merch · Built different',
  description:
    'Official Kush World community — lab-tested hemp, studio merch, and discreet shipping. 21+ only.',
};

export const CATEGORY_NAMES = {
  info: 'INFO',
  shop: 'SHOP',
  products: 'PRODUCTS',
  community: 'COMMUNITY',
  media: 'MEDIA',
  regions: 'REGIONS',
  voice: 'VOICE',
  staff: 'STAFF',
};

export const RULES_BODY =
  `**${BRAND.name}** — ${BRAND.tagline}\n\n` +
  `**01** · 21+ only · follow your local laws\n` +
  `**02** · Be respectful — no harassment, hate, or drama\n` +
  `**03** · No sourcing, illegal sales, or sketchy DMs\n` +
  `**04** · Order help → <#ORDER_HELP> · don't post personal info publicly\n` +
  `**05** · No medical claims — adults only, shop responsibly\n\n` +
  `Get <@&VERIFIED_ROLE> in <#ROLES_CH> to unlock the server.\n` +
  `Shop → ${BRAND.site}`;