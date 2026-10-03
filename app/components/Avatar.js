'use client';

import { useMemo } from 'react';

export default function Avatar({
  name = '',
  src = null,
  size = 'md',
  className = '',
  textClassName = '',
  bgClassName = '',
  borderClassName = '',
}) {

  const initials = useMemo(() => getInitials(name), [name]);

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
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ffdb00] text-black',
        sizeMap[size] || sizeMap.md,
        borderClassName,
        className,
      ].join(' ')}
    >
      <span className={['font-bold leading-none tracking-[-0.02em]', textClassName].join(' ')}>{initials}</span>
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