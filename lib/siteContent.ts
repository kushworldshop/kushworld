import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/siteContentTypes';
import { mergeSiteFeatures } from '@/lib/featureTypes';
import { mergeHomepageLayout } from '@/lib/homepageLayout';
import { mergeHomepageBlocks, mergeHomepageCopy } from '@/lib/homepageCopy';
import { readMaintenanceModeSync, writeMaintenanceMode } from '@/lib/maintenanceMode';
import { mergeShopNavigation } from '@/lib/shopNavigation';
import { normalizeDiscordInviteUrl } from '@/lib/discordInvite';

const SITE_CONTENT_FILE = path.join(process.cwd(), 'data', 'site-content.json');

export type { SiteContent, HeroVariant, FaqItem, LoyaltyCard, PolicyPage } from '@/lib/siteContentTypes';
export { DEFAULT_SITE_CONTENT, splitHeadline } from '@/lib/siteContentTypes';

async function ensureSiteContentFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(SITE_CONTENT_FILE);
  } catch {
    await fs.writeFile(SITE_CONTENT_FILE, JSON.stringify(DEFAULT_SITE_CONTENT, null, 2));
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMergeSiteContent<T>(base: T, patch: Partial<T>): T {
  const result = { ...base } as T;
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const value = patch[key];
    if (value === undefined) continue;
    const existing = base[key];
    if (isPlainObject(value) && isPlainObject(existing)) {
      result[key] = deepMergeSiteContent(existing, value as Partial<typeof existing>);
    } else {
      result[key] = value as T[keyof T];
    }
  }
  return result;
}

export async function getSiteContent(): Promise<SiteContent> {
  await ensureSiteContentFile();
  const data = await fs.readFile(SITE_CONTENT_FILE, 'utf8');
  const parsed = JSON.parse(data) as Partial<SiteContent>;
  const merged = deepMergeSiteContent(DEFAULT_SITE_CONTENT, parsed);
  return {
    ...merged,
    social: {
      ...merged.social,
      discordUrl: normalizeDiscordInviteUrl(merged.social.discordUrl),
    },
    features: (() => {
      const features = mergeSiteFeatures(parsed.features);
      const maintenance = readMaintenanceModeSync();
      features.maintenanceMode = {
        ...features.maintenanceMode,
        enabled: maintenance.enabled,
        message: maintenance.message || features.maintenanceMode.message,
      };
      return features;
    })(),
    shopNavigation: mergeShopNavigation(parsed.shopNavigation),
    homepageCopy: mergeHomepageCopy(parsed.homepageCopy),
    homepageBlocks: mergeHomepageBlocks(parsed.homepageBlocks),
    homepageLayout: {
      sections: mergeHomepageLayout(
        parsed.homepageLayout?.sections,
        mergeSiteFeatures(parsed.features),
        mergeHomepageBlocks(parsed.homepageBlocks).map((block) => block.id)
      ),
    },
  };
}

export async function updateSiteContent(updates: Partial<SiteContent>): Promise<SiteContent> {
  const current = await getSiteContent();
  const next = deepMergeSiteContent(current, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await fs.writeFile(SITE_CONTENT_FILE, JSON.stringify(next, null, 2));
  await writeMaintenanceMode({
    enabled: Boolean(next.features.maintenanceMode?.enabled),
    message: next.features.maintenanceMode?.message || '',
  });
  return next;
}