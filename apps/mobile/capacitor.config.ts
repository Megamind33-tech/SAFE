import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'zm.co.safe.app',
  appName: 'SAFE',
  webDir: 'dist',
  android: {
    // Required: Capacitor serves from https://localhost; API calls to http://
    // (local dev, emulator 10.0.2.2) are mixed content and blocked without this.
    // Production builds should point VITE_API_BASE_URL at an HTTPS endpoint.
    allowMixedContent: true,
  },
};

export default config;
