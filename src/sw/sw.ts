/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { mediaStreamCacheHandler } from './stream';
import '@/sw/routes' 
import { routeApi } from './router';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[] }

precacheAndRoute(self.__WB_MANIFEST);

/**
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