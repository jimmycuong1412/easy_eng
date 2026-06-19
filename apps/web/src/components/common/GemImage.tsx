'use client';

import * as React from 'react';

interface GemImageProps {
  size?: number;
  className?: string;
  alt?: string;
}

export function GemImage({ size = 16, className = '', alt = 'Gem' }: GemImageProps) {
  return (
    <img
      src="/gem.svg"
      alt={alt}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      onError={(e) => {
        // Fallback to emoji if image missing
        const target = e.currentTarget;
        target.style.display = 'none';
        const span = document.createElement('span');
        span.textContent = '💎';
        span.style.fontSize = `${size}px`;
        target.parentNode?.insertBefore(span, target);
      }}
    />
  );
}

export default GemImage;
