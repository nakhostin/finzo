import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

const isElectron = process.env.ELECTRON === 'true'

// https://vite.dev/config/
export default defineConfig({
  base: isElectron ? './' : '/',
  define: {
    __IS_ELECTRON__: JSON.stringify(isElectron),
  },
  plugins: [
    react(),
    tailwindcss(),
    !isElectron && VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Finzo',
        short_name: 'Finzo',
        description: 'مدیریت آفلاین درآمد، بدهی، اقساط، چک و دارایی‌ها',
        lang: 'fa',
        dir: 'rtl',
        theme_color: '#2563eb',
        background_color: '#2563eb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico}'],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: [
      ...(isElectron
        ? [
            {
              find: "@/components/PwaUpdatePrompt",
              replacement: path.resolve(
                __dirname,
                "./src/components/PwaUpdatePrompt.electron.tsx",
              ),
            },
            {
              find: "@/components/PwaUpdatePrompt.web",
              replacement: path.resolve(
                __dirname,
                "./src/components/PwaUpdatePrompt.electron.tsx",
              ),
            },
            {
              find: "@/lib/autoBackup",
              replacement: path.resolve(__dirname, "./src/lib/autoBackup.electron.ts"),
            },
            {
              find: "@/lib/autoBackup.web",
              replacement: path.resolve(__dirname, "./src/lib/autoBackup.electron.ts"),
            },
          ]
        : []),
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
})
