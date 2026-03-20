// app/components/NavFrame.js
'use client';

import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

export default function NavFrame({ children }) {
  const pathname = usePathname();
  const hideNav = pathname?.startsWith('/auth');

  return (
    <div className="min-h-screen">
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}