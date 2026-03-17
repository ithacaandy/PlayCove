// app/components/NavLayoutClient.js
'use client';

import { usePathname } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function NavLayoutClient({ children }) {
  const pathname = usePathname();
  const isAuth = pathname?.startsWith('/auth');

  return (
    <>
      {/* Top nav hidden on auth routes */}
      {!isAuth && (
        <div className="hidden md:block">
          <Header />
        </div>
      )}

      <main className={`mx-auto max-w-screen-md px-3 ${isAuth ? '' : 'pb-20 md:pb-6'}`}>
        {children}
      </main>

      {/* Bottom nav hidden on auth routes */}
      {!isAuth && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}
    </>
  );
}
