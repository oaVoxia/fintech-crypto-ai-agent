import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fintech Crypto AI Agent',
  description: 'AI agent for cryptocurrency market analysis, portfolio insights, and paper trading.',
  manifest: '/manifest.webmanifest',
  themeColor: '#8b5cf6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Crypto Agent',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="bg-[#0f0f12] text-gray-200 font-sans antialiased">{children}</body>
    </html>
  );
}