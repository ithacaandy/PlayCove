'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

export default function Avatar({
  name = '',
  src = null,
  size = 'md',
  className = '',
  textClassName = '',
  bgClassName = '',
  borderClassName = '',
}) {
  const [failedSrc, setFailedSrc] = useState(null);

  const initials = useMemo(() => getInitials(name), [name]);
  const showImage = !!src && failedSrc !== src;

  const sizeMap = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-16 w-16 text-lg',
    lg: 'h-20 w-20 text-xl',
    xl: 'h-[88px] w-[88px] text-[44px]',
  };

  return (
    <div
      className={[
        'relative flex shrink-0 items-center justify-center text-black',
        sizeMap[size] || sizeMap.md,
        borderClassName,
        className,
      ].join(' ')}
    >
      <Image src="/brand/lemon-logo.png" alt="" aria-hidden="true" fill sizes="88px" className="pointer-events-none object-contain" />
      <div className="absolute left-[47%] top-[61%] flex h-[64%] w-[64%] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full">
      {showImage ? (
        <Image
          src={src}
          alt={name || 'Avatar'}
          fill
          sizes="80px"
          className="rounded-full border border-white/80 object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div
          className={[
            'flex h-full w-full items-center justify-center font-bold tracking-[-0.02em] text-black',
            textClassName,
          ].join(' ')}
        >
          <span className="text-[0.8em] leading-none">{initials}</span>
        </div>
      )}
      </div>
    </div>
  );
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}