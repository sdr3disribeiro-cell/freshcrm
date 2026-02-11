import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: true, // Allows access via IP (ex: 192.168.x.x)
    port: 3000, // Forces port 3000 to match Google Console config
    allowedHosts: mode === 'development' ? ['192.168.15.9.sslip.io', '192.168.15.6.sslip.io', '192.168.15.7.sslip.io'] : [],
  },
}));