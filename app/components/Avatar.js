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
  const [broken, setBroken] = useState(false);

  const initials = useMemo(() => getInitials(name), [name]);
  const showImage = !!src && !broken;

  const sizeMap = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-16 w-16 text-lg',
    lg: 'h-20 w-20 text-xl',
  };

  return (
    <div
      className={[
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black bg-[var(--sunshine)] text-black',
        sizeMap[size] || sizeMap.md,
        borderClassName,
        className,
      ].join(' ')}
    >
      {showImage ? (
        <Image
          src={src}
          alt={name || 'Avatar'}
          fill
          sizes="80px"
          className="object-cover"
          onError={() => setBroken(true)}
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