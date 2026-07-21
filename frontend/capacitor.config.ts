import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.valis.pos',
  appName: 'Valis POS',
  webDir: 'dist',
  server: {
    url: 'http://192.168.101.14:8000',
    cleartext: true,
    allowNavigation: ['192.168.101.14'],
  },
};

export default config;
