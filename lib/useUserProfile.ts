'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicUserProfile } from '@/lib/users';

export function useUserProfile() {
  const [user, setUser] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user) {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        return data.user as PublicUserProfile;
      }
      setUser(null);
      localStorage.removeItem('currentUser');
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('currentUser');
    setUser(null);
  };

  return { user, loading, refresh, logout, isLoggedIn: !!user };
}