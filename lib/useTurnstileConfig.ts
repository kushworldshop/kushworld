'use client';

import { useCallback, useEffect, useState } from 'react';

export function useTurnstileConfig() {
  const [enabled, setEnabled] = useState(false);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/turnstile/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const key = data?.siteKey || null;
        setEnabled(Boolean(data?.enabled && key));
        setSiteKey(key);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const clearToken = useCallback(() => setToken(''), []);
  const onToken = useCallback((t: string) => setToken(t), []);

  return { enabled, siteKey, token, loaded, clearToken, onToken };
}