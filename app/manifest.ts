import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fintech Crypto AI Agent',
    short_name: 'Crypto Agent',
    description: 'AI agent for crypto research, paper trading, and market sentiment',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f12',
    theme_color: '#8b5cf6',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}