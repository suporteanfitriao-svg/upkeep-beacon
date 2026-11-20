import { useSignedUrl } from '@/hooks/useSignedUrl';

/** <img> for property cover photos in the private bucket: swaps the stored URL for a signed one. */
export function SignedPropertyImg({ src, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const signed = useSignedUrl('property-images', src ?? null);
  if (!signed) return <div className={rest.className} aria-hidden />;
  return <img src={signed} {...rest} />;
}
