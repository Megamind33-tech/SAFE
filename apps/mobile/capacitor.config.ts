import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'zm.co.safe.app',
  appName: 'SAFE',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
