import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';
import { MODEL_REVISION, MODEL_URL } from './src/pose/model';

export default defineConfig(({ command }) => ({
  // GitHub Pages отдаёт сайт из подпапки /<репозиторий>/ — путь передаёт workflow.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    // Только для `npm run dev`: самоподписанный сертификат, потому что камера работает
    // только по HTTPS, а `vite --host` открывает сервер в локальной сети для телефона.
    command === 'serve' && basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FitILY — тренер с камерой',
        short_name: 'FitILY',
        description: 'Считает правильно выполненные повторения через камеру телефона',
        lang: 'ru',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Всё приложение, включая WASM MediaPipe (~14 МБ), кэшируется при первом открытии.
        globPatterns: ['**/*.{js,css,html,wasm,svg,png}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        // Модель лежит у Google; service worker скачивает её при установке,
        // поэтому после первого открытия приложение работает в зале без интернета.
        additionalManifestEntries: [{ url: MODEL_URL, revision: MODEL_REVISION }],
      },
    }),
  ],
}));
