import { useSignedUrl } from '@/hooks/useSignedUrl';
import { cn } from '@/lib/utils';
import { ImgHTMLAttributes } from 'react';

interface SignedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Storage path or legacy public URL of the object. */
  src: string | null | undefined;
  /** Bucket name where the object lives. */
  bucket: string;
  /** Optional fallback rendered when no src or signed URL cannot be generated. */
  fallback?: React.ReactNode;
  /** When true, renders the raw src directly (useful while bucket stays public). */
  preferRaw?: boolean;
}

/**
 * Renders an image stored in a Supabase Storage bucket.
 * - When `preferRaw` is true and `src` looks like a full URL, it is used as-is.
 * - Otherwise a short-lived signed URL is requested via {@link useSignedUrl}.
 * Falls back to `fallback` when nothing can be displayed.
 */
export function SignedImage({
  src,
  bucket,
  fallback = null,
  preferRaw = false,
  className,
  alt = '',
  ...rest
}: SignedImageProps) {
  const isFullUrl = !!src && /^https?:\/\//i.test(src);
  const useRaw = preferRaw && isFullUrl;
  const signed = useSignedUrl(bucket, useRaw ? null : src ?? null);
  const finalSrc = useRaw ? src! : signed;

  if (!src || !finalSrc) {
    return <>{fallback}</>;
  }
  return <img src={finalSrc} alt={alt} className={cn(className)} {...rest} />;
}