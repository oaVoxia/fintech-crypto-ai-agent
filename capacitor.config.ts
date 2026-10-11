import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oavoxia.fintechcryptoagent',
  appName: 'Fintech Crypto Agent',
  webDir: 'out',
  server: {
    url: 'https://your-vercel-app.vercel.app', // Replace with your deployed URL
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