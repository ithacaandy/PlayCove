// app/layout.js
import './globals.css';
import NavFrame from './components/NavFrame';

export const metadata = {
  title: 'PlayCove',
  description: 'Connect with nearby families through groups and playdate events.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* IMPORTANT: no bg color here so /auth can show its own background */}
      <body className="min-h-screen text-gray-900 antialiased">
        <NavFrame>{children}</NavFrame>
      </body>
    </html>
  );
}
