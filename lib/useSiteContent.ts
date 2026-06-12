'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/siteContentTypes';

let cachedContent: SiteContent | null = null;
let fetchPromise: Promise<SiteContent> | null = null;

async function loadSiteContent(): Promise<SiteContent> {
  if (cachedContent) return cachedContent;
  if (!fetchPromise) {
    fetchPromise = fetch('/api/site-content')
      .then((res) => (res.ok ? res.json() : { content: DEFAULT_SITE_CONTENT }))
      .then((data) => {
        const merged = {
          ...DEFAULT_SITE_CONTENT,
          ...(data.content || {}),
          shopNavigation: {
            ...DEFAULT_SITE_CONTENT.shopNavigation,
            ...(data.content?.shopNavigation || {}),
            categories:
              data.content?.shopNavigation?.categories?.length
                ? data.content.shopNavigation.categories
                : DEFAULT_SITE_CONTENT.shopNavigation.categories,
          },
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