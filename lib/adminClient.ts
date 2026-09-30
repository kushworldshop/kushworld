export async function adminFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
    },
  });
}

export async function adminJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const error =
      res.status === 413
        ? 'File is too large. Use an MP4 or WEBM under 50MB.'
        : `Request failed (${res.status || 'network'})`;
    return { success: false, error } as T;
  }
}