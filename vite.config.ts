import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const env = loadEnv('development', process.cwd())

// https://vite.dev/config/
export default defineConfig({
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
      filename: 'sw.ts',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      injectManifest: {
        // globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf,woff,woff2}'],
      },
      manifest: {
        name: 'WMusicPlayer',
        short_name: 'WPlayer',
        description: 'PWA Music Player from weyeco',
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
    proxy: {
      '/api': {
        target: env.VITE_BASE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: ['es2022', 'chrome89', 'edge89', 'firefox88', 'safari15.4'],
  },
  esbuild: {
    target: 'es2022',
  },
})