/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { mediaStreamCacheHandler } from './stream';
import '@/sw/routes' 
import { routeApi } from './router';

// 构建时注入的版本号：确保每次构建 sw.js 内容都不同，触发浏览器更新检测
// 即使 sw.ts 源文件无变化，__WB_MANIFEST 的 revision 变化也会反映到构建产物
// 注意：__SW_VERSION__ 会被 @rollup/plugin-replace 替换为 JSON 字符串（含引号）
declare const __SW_VERSION__: string;
const SW_VERSION = __SW_VERSION__;
declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[]; __SW_VERSION__: string }

// 版本号写入全局，便于调试时确认当前 SW 版本
self.__SW_VERSION__ = SW_VERSION;

precacheAndRoute(self.__WB_MANIFEST);

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
  ({ url, request}) => url.pathname.startsWith('/api') && request.method === 'GET', 
  ({ request }) => routeApi(request)
)


// self.skipWaiting()
// clientsClaim()