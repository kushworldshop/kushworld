'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/siteContentTypes';
import { mergeSiteFeatures } from '@/lib/featureTypes';

let cachedContent: SiteContent | null = null;
let fetchPromise: Promise<SiteContent> | null = null;

async function loadSiteContent(): Promise<SiteContent> {
  if (cachedContent) return cachedContent;
  if (!fetchPromise) {
    fetchPromise = fetch('/api/site-content')
      .then((res) => (res.ok ? res.json() : { content: DEFAULT_SITE_CONTENT }))
      .then((data) => {
        const patch = data.content || {};
        const merged = {
          ...DEFAULT_SITE_CONTENT,
          ...patch,
          social: {
            ...DEFAULT_SITE_CONTENT.social,
            ...(patch.social || {}),
          },
          shopNavigation: {
            ...DEFAULT_SITE_CONTENT.shopNavigation,
            ...(patch.shopNavigation || {}),
            categories:
              patch.shopNavigation?.categories?.length
                ? patch.shopNavigation.categories
                : DEFAULT_SITE_CONTENT.shopNavigation.categories,
          },
          features: mergeSiteFeatures(patch.features),
        };
        cachedContent = merged;
        return merged;
      })
      .catch(() => {
        cachedContent = DEFAULT_SITE_CONTENT;
        return DEFAULT_SITE_CONTENT;
      });
  }
  return fetchPromise;
}

export function invalidateSiteContentCache() {
  cachedContent = null;
  fetchPromise = null;
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadSiteContent().then((loaded) => {
      if (active) {
        setContent(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { content, ready };
}