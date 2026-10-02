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
      style={{borderRadius:'45% 55% 45% 55% / 55% 45% 55% 45%'}}
      className={[
        'relative flex shrink-0 items-center justify-center border-2 border-yellow-400 bg-[var(--sunshine)] text-black',
        sizeMap[size] || sizeMap.md,
        borderClassName,
        className,
      ].join(' ')}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-1 right-0 z-10 h-[22%] w-[30%] rounded-[0_80%_0_80%] bg-green-600" />
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden" style={{borderRadius:'inherit'}}>
      {showImage ? (
        <Image
          src={src}
          alt={name || 'Avatar'}
          fill
          sizes="80px"
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div
          className={[
            'flex h-full w-full items-center justify-center bg-[var(--sunshine)] font-bold tracking-[-0.02em] text-black',
            bgClassName,
            textClassName,
          ].join(' ')}
        >
          <span className="leading-none">{initials}</span>
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