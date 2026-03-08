import Image from 'next/image';
import { cn } from '@/lib/utils';

interface GemImageProps {
  size?: number | string;
  className?: string;
  alt?: string;
}

/**
 * Gem image component using the gem.svg asset.
 * Use this instead of the 💎 emoji for visual gem representations.
 */
export function GemImage({ size = 24, className, alt = 'Gem' }: GemImageProps) {
  const px = typeof size === 'number' ? size : undefined;
  return (
    <Image
      src="/gem.svg"
      alt={alt}
      width={px ?? 24}
      height={px ?? 24}
      className={cn('inline-block', className)}
      style={typeof size === 'string' ? { width: size, height: size } : undefined}
      unoptimized
    />
  );
}
