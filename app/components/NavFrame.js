// app/components/NavFrame.js
'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import BottomNav from './BottomNav';

export default function NavFrame({ children }) {
  const pathname = usePathname();
  const hideNav = pathname?.startsWith('/auth'); // hide nav + bg on auth pages

  return (
    <div className={hideNav ? '' : 'bg-white min-h-screen'}>
      {!hideNav && (
        <div className="hidden md:block">
          <Header />
        </div>
      )}

      <main className="mx-auto max-w-screen-md px-3 pb-20 md:pb-6">
        {children}
      </main>

      {!hideNav && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
}
