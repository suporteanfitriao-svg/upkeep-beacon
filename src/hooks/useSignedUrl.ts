import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const cache = new Map<string, { url: string; expiresAt: number }>();
const TTL_SECONDS = 60 * 60; // 1h

/**
 * Returns a signed URL for an object stored in a private bucket.
 * Accepts either a storage path or a legacy public URL (will extract the path).
 * Caches results in-memory and refreshes when expired.
 */
export function useSignedUrl(bucket: string, pathOrUrl: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }
    let active = true;

    // Extract path if a full public URL was passed
    const marker = `/${bucket}/`;
    const idx = pathOrUrl.indexOf(marker);
    const path = idx >= 0 ? pathOrUrl.substring(idx + marker.length) : pathOrUrl;
    const cacheKey = `${bucket}:${path}`;

    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 30_000) {
      setUrl(cached.url);
      return;
    }

    (async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, TTL_SECONDS);
      if (!active) return;
      if (error || !data) {
        setUrl(null);
        return;
      }
      cache.set(cacheKey, {
        url: data.signedUrl,
        expiresAt: Date.now() + TTL_SECONDS * 1000,
      });
      setUrl(data.signedUrl);
    })();

    return () => {
      active = false;
    };
  }, [bucket, pathOrUrl]);

  return url;
}
