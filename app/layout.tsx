import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fintech Crypto AI Agent',
  description: 'AI agent for cryptocurrency market analysis, portfolio insights, and paper trading using free CoinGecko MCP.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans">{children}</body>
    </html>
  );
}