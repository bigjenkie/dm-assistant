import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nullarc.primer',
  appName: 'The Primer',
  webDir: 'dist',
  server: {
    // For dev: point to Vite dev server instead of static files
    // url: 'http://localhost:5173',
    // cleartext: true,
  },
  ios: {
    scheme: 'The Primer',
    contentInset: 'automatic',
  },
};

export default config;
