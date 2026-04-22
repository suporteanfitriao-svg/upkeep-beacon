import { useSignedUrl } from '@/hooks/useSignedUrl';
import { cn } from '@/lib/utils';

interface PropertyImageProps {
  imageUrl: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Renders a property cover image stored in the private `property-images` bucket
 * via a short-lived signed URL. Falls back to the provided fallback node when
 * no image is set or the signed URL cannot be generated.
 */
export function PropertyImage({ imageUrl, alt, className, fallback }: PropertyImageProps) {
  const signed = useSignedUrl('property-images', imageUrl ?? null);
  if (!imageUrl || !signed) {
    return <>{fallback}</>;
  }
  return <img src={signed} alt={alt} className={cn('object-cover', className)} />;
}
