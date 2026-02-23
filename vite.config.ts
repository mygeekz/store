// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { VitePWA } from 'vite-plugin-pwa';

// ✅ مسیر فایل‌های cert ساخته‌شده با mkcert
const CERT_FILE = path.resolve(__dirname, '192.168.1.106+2.pem');
const KEY_FILE = path.resolve(__dirname, '192.168.1.106+2-key.pem');

export default defineConfig({
  plugins: [
    react(),

    // ✅ PWA
    VitePWA({
      registerType: 'autoUpdate',

      // ✅ برای تست PWA در حالت توسعه (روی شبکهٔ محلی)
      devOptions: { enabled: true },

      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png',
      ],

      manifest: {
        name: 'مدیریت فروشگاه کوروش',
        short_name: 'کوروش',
        description: 'سامانه جامع مدیریت فروشگاه و انبارداری کوروش',
        start_url: '/#/',
        scope: '/',
        theme_color: '#0d9488',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // ✅ برای SPA (React + HashRouter)؛ اجازه بده ناوبری‌ها به index برگردن
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],

  // ✅ aliasها
  resolve: {
    alias: {
      'lucide-react': path.resolve(__dirname, './components/lucide-react'),
      '@': path.resolve(__dirname, '.'),
      '@src': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './components'),
      '@pages': path.resolve(__dirname, './pages'),
      '@contexts': path.resolve(__dirname, './contexts'),
      '@utils': path.resolve(__dirname, './utils'),
      '@types': path.resolve(__dirname, './types'),
      '@assets': path.resolve(__dirname, './assets'),
      '@styles': path.resolve(__dirname, './styles'),
      '@hooks': path.resolve(__dirname, './hooks'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5173,

    // ✅ HTTPS واقعی (trusted) با mkcert — basicSsl حذف شد
    https: {
      cert: fs.readFileSync(CERT_FILE),
      key: fs.readFileSync(KEY_FILE),
    },

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
