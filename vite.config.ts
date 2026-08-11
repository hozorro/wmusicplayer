import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const apiBase = env.VITE_API_BASE || 'http://127.0.0.1:8000'

  return {
    plugins: [
      vue(),
      tailwindcss(),
      VueI18nPlugin({
        include: [path.resolve(__dirname, './src/i18n/langs/**')],
        runtimeOnly: false,
        compositionOnly: true,
      }),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: './sw/sw.ts',
        devOptions: {
          enabled: true,
          type: 'module',
        },
        injectManifest: {
          // globDirectory: 'dist',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
        manifest: {
          name: 'WMusicPlayer',
          short_name: 'WPlayer',
          description: 'PWA Music Player from weyeco',
          display: 'standalone',
          theme_color: '#18181b',
          icons: [
            {
              src: '/imgs/manifest/web-app-manifest-48x48.png',
              sizes: '48x48',
              type: 'image/png',
            },
            {
              src: '/imgs/manifest/web-app-manifest-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/imgs/manifest/web-app-manifest-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/imgs/manifest/web-app-manifest.svg',
              sizes: '513x513',
            },
          ],
        }
      })
    ],
    base: '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
      https: {
        cert: fs.readFileSync(env.VITE_SSL_CERT),
        key: fs.readFileSync(env.VITE_SSL_KEY),
      },
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
        },
        '/media': {
          target: apiBase,
          changeOrigin: true,
        },
      },
    },
    build: {
      target: ['es2022', 'chrome89', 'edge89', 'firefox88', 'safari15.4'],
    },
    esbuild: {
      target: 'es2022',
    },
  }
})