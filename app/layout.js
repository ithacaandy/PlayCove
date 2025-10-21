import './globals.css';
import Header from './components/Header';
import BottomNav from './components/BottomNav';

export const metadata = {
  title: 'PlayCove',
  description: 'Connect with nearby families through groups and playdate events.',
};

export const viewport = {
  viewportFit: 'cover', // iOS safe area
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {/* Hide header on mobile, show on md+ */}
        <div className="hidden md:block">
          <Header />
        </div>

        {/* Main content area */}
        <main className="mx-auto max-w-screen-md px-3 pb-20 md:pb-6">
          {children}
        </main>

        {/* Persistent bottom nav (mobile only) */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
