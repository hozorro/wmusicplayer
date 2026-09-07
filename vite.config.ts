import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import replace from '@rollup/plugin-replace'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const apiBase = env.VITE_API_BASE || 'http://127.0.0.1:8000'
  // 仅当本地配置了证书路径时才启用 HTTPS（CI 构建无此变量，无条件 readFileSync 会因 undefined 报错）
  const httpsCert = env.VITE_SSL_CERT && env.VITE_SSL_KEY
    ? { cert: fs.readFileSync(env.VITE_SSL_CERT), key: fs.readFileSync(env.VITE_SSL_KEY) }
    : undefined
  const version = Date.now().toString(36)

  return {
    define: {
      __SW_VERSION__: version,
    },
    plugins: [
      vue(),
      tailwindcss(),
      VueI18nPlugin({
        include: [path.resolve(__dirname, './src/i18n/langs/**')],
        runtimeOnly: false,
        compositionOnly: true,
      }),
      VitePWA({
        registerType: 'prompt',
        // 必须注入注册脚本：usePWAUpdate 依赖 navigator.serviceWorker.ready 获取 registration
        injectRegister: 'script',
        strategies: 'injectManifest',
        // filename 不能含子目录：插件把 SW 构建产物输出到 outDir 根，
        // 再 rename 到 dirname(swDest)，两者不一致会报 ENOENT
        srcDir: 'src/sw',
        filename: 'sw.ts',
        devOptions: {
          enabled: true,
          type: 'module',
          // 在开发环境中也注入版本号
          navigateFallback: undefined,
        },
        injectManifest: {
          // globDirectory: 'dist',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
        // 通过 integration.configureCustomSWViteBuild 直接修改 SW 构建的 inlineConfig
        integration: {
          configureCustomSWViteBuild(inlineConfig) {
            // 确保每次构建 sw.js 内容不同，触发浏览器更新检测
            console.log('[PWA] Injecting __SW_VERSION__:', version)
            // 使用 @rollup/plugin-replace 在 Rollup 构建时替换 __SW_VERSION__
            inlineConfig.build = inlineConfig.build ?? {}
            inlineConfig.build.rollupOptions = inlineConfig.build.rollupOptions ?? {}
            const existingPlugins = inlineConfig.build.rollupOptions.plugins
            inlineConfig.build.rollupOptions.plugins = [
              ...(Array.isArray(existingPlugins) ? existingPlugins : existingPlugins ? [existingPlugins] : []),
              replace({
                preventAssignment: true,
                values: {
                  __SW_VERSION__: JSON.stringify(version),
                },
              }) as any,
            ]
          },
        },
        manifest: {
          id: '/',
          name: 'WMusicPlayer',
          short_name: 'WMusic',
          description: 'PWA Music Player from weyeco',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#18181b',
          background_color: '#18181b',
          icons: [
            {
              src: '/icons/icon-48.png',
              sizes: '48x48',
              type: 'image/png',
            },
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            }
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
      https: httpsCert,
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