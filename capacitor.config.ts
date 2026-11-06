import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymhub.aura',
  appName: 'GYM HUB',
  webDir: 'public',
  server: {
    url: 'https://aurafit-liard.vercel.app',
    cleartext: false,
    androidScheme: 'https'
  }
};

export default config;

