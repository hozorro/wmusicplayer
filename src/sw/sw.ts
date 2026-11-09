/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { mediaStreamCacheHandler } from './stream';
import '@/sw/routes' 
import { routeApi } from './router';

// 构建时注入的版本号：确保每次构建 sw.js 内容都不同，触发浏览器更新检测
// 即使 sw.ts 源文件无变化，__WB_MANIFEST 的 revision 变化也会反映到构建产物
// 注意：__SW_VERSION__ 会被 @rollup/plugin-replace 替换为 JSON 字符串（含引号）
declare const __SW_VERSION__: string;
// 在开发环境中，__SW_VERSION__ 可能未定义，使用默认值
export const SW_VERSION = typeof __SW_VERSION__ !== 'undefined' ? __SW_VERSION__ : 'dev';
declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[]; __SW_VERSION__: string }

// 版本号写入全局，便于调试时确认当前 SW 版本
self.__SW_VERSION__ = SW_VERSION;

precacheAndRoute(self.__WB_MANIFEST);

/**
 * SPA 深链离线回落
 * / 与 /index.html 会被上面的 precache 路由直接命中；/playlist/3 之类不在预缓存清单中，
 * 离线打开会 404。在线时透传网络，保证 nginx 的 no-cache 能返回最新 HTML；
 * 只有离线或网络失败才回落到预缓存的 App Shell。
 */
const appShell = createHandlerBoundToURL('index.html')
const navigationHandler = async (options: Parameters<typeof appShell>[0]): Promise<Response> => {
  if (!self.navigator.onLine) return appShell(options)
  try {
    return await fetch(options.request)
  } catch {
    return appShell(options)
  }
}
registerRoute(new NavigationRoute(navigationHandler, {
  denylist: [/^\/api\//, /^\/media\//, /^\/music\//, /^\/admin(\/|$)/],
}))

// 收到主线程的 skipWaiting 指令时立即激活
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// 激活后立即接管所有客户端
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

// 通知所有客户端“我已更新完成，请刷新”
self.addEventListener('controllerchange', () => {
  // 这个事件在新 SW 接管时出发，但在主线程处理更灵活，这里仅作备份
})

/**
 * 路由注册
 * 注册顺序 = 优先级：stream -> cover -> IDB 路由表
 * stream：透传 + Range 字节缓存（位于 src/sw/stream.ts）
 */
registerRoute(({ url }) => url.pathname.startsWith('/api/stream'), mediaStreamCacheHandler)

/**
 * cover 静态资源：/media/...?v=<..._art_hash>
 * v 查询参数为缓存失效键；CacheFirst + 容量上限（LRU 清退）
 */
registerRoute(
  ({ url }) => url.pathname.startsWith('/media'), new CacheFirst({
    cacheName: 'cover-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,              // 缓存条目上限防膨胀
        maxAgeSeconds: 60 * 60 * 24,
        purgeOnQuotaError: true       // 配额告警时有限清理本缓存
      })
    ]
  })
)

// 其余 GET /api/*：IDB 路由表；MISS / 异常自动回落网络
registerRoute(
  ({ url, request}) => url.pathname.startsWith('/api') 
    && !url.pathname.startsWith('/api/admin') // 当admin与player部署在同一域名下且时，防止player接管admin接口
    && request.method === 'GET', 
  ({ request }) => routeApi(request)
)


// self.skipWaiting()
// clientsClaim()