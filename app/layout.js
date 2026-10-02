// app/layout.js
import './globals.css';
import NavFrame from './components/NavFrame';

export const metadata = {
  title: 'LinkLemon',
  appleWebApp: {capable:true,title:'LinkLemon',statusBarStyle:'default'},
  icons: {icon:[{url:'/brand/lemon-logo.png',type:'image/png',sizes:'128x128'}],shortcut:'/brand/lemon-logo.png',apple:'/brand/lemon-logo.png'},
  description: 'Connect with nearby families through groups and playdate events.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-gray-900 antialiased">
        <NavFrame>{children}</NavFrame>
      </body>
    </html>
  );
}