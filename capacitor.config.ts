import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oavoxia.fintechcryptoagent',
  appName: 'Fintech Crypto Agent',
  webDir: 'public', // For live server.url mode; use 'out' only if doing static export
  server: {
    // IMPORTANT: Replace with your actual deployed Vercel URL after deploy
    url: process.env.CAPACITOR_SERVER_URL || 'https://your-vercel-app.vercel.app',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f0f12',
    },
  },
};

export default config;