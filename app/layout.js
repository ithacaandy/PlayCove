// app/layout.js
import './globals.css';

// Try to import Header if present
let Header;
try {
  Header = require('./components/Header').default;
} catch {
  console.warn('⚠️ Header component not found — continuing without it.');
}

// Import BottomNav (added in this patch)
let BottomNav;
try {
  BottomNav = require('./components/BottomNav').default;
} catch {
  console.warn('⚠️ BottomNav component not found — continuing without it.');
}

export const metadata = {
  title: 'PlayCove',
  description: 'Mobile-first community app for parents to create groups and share playdates.',
};

// Next.js 14+: viewport must be separate
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFCD02',
};

export default function RootLayout({ children }) {
  // Header height ~56px; BottomNav height ~64px. Add padding so content isn't obscured.
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        {Header ? <Header /> : null}

        <main className="pb-20 pt-14 mx-auto max-w-screen-md px-3">
          {children}
        </main>

        {BottomNav ? <BottomNav /> : null}
      </body>
    </html>
  );
}
