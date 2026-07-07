/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { registerRoute } from 'workbox-routing'
import { indexedDbHelper } from './apis/idb-funcs'
import idbConfig from './apis/idb-config'
import mappingIdbApis from './apis/methods/idb-map'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

let isIDBReady = false

self.addEventListener('install', async (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open('pwa-state');
      const response = await cache.match('/__db_ready');
      if (response) {
        const text = await response.text();
        isIDBReady = text == 'true';
      } 
      console.log('[SW] IndexedDB ready status on install:', isIDBReady);
    })()
  )
})

self.addEventListener('activate', async () => {
  const cache = await caches.open('pwa-state');
  const response = await cache.match('/__db_ready');
  isIDBReady = response ? (await response.text()) == 'true' : false;
  console.log('[SW] IndexedDB ready status on activate:', isIDBReady);
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'IDB_Ready') {
    isIDBReady = true;
    console.log('[SW] IndexedDB is ready, now serving from cache.');
  }
})

const isStaticResourcesFetch = (url: URL) => {
  return url.pathname.startsWith('/media')
}

registerRoute(
  ({ url }) => isStaticResourcesFetch(url),
  new CacheFirst({
    cacheName: 'static-resources',
    fetchOptions: {
      mode: 'cors',
      credentials: 'omit'
    },
    matchOptions: {
      ignoreSearch: false,
    },
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      })
    ]
  })
)

const idbHelper = new indexedDbHelper(idbConfig)

const extractPathParams = (templatePath: string, acturalPath: string) => {
  const templateParts = templatePath.split('/')
  const acturalParts = acturalPath.split('/')

  if (templateParts.length !== acturalParts.length) return null // path not matched

  const params: Record<string, string> = {}
  for (let i = 0; i < templateParts.length; i++) {
    const templatePart = templateParts[i]
    const acturalPart = acturalParts[i]
    if (templatePart.startsWith('{') && templatePart.endsWith('}')) {
      const paramName = templatePart.slice(1, -1)
      params[paramName] = acturalPart
    } else if (templatePart !== acturalPart) {
      return null // path not matched
    }
  }
  return params
}

const idbApis = mappingIdbApis(idbHelper)

const idbHandler = (method: keyof IdbApiDict) => { 
  async function _idbOrNetwork({url, request}: {url: URL, request: Request}) {
    if (!isIDBReady) return fetch(request)
    const actualPath = url.pathname.replace(/^\/api\/music\//, '')
    if (idbApis[method]) {
      // match handler
      for (const {path, handler} of idbApis[method]) {
        if (request.method.toUpperCase() !== method) continue

        // match path and extract request params of path, query and body
        // 1. check if path matched and extract path params
        const pathParams = extractPathParams(path, actualPath)
        if (pathParams !== null) {  // path matched including either have params or params={}
          try {
            // 2. extract query params
            const queryParams: Record<string, string> = {}
            const urlSearchParams = new URLSearchParams(url.search)
            urlSearchParams.forEach((value, key) => {
              queryParams[key] = value
            })
            const requestMethod = request.method.toUpperCase()
            const options: IdbApiOptions = {
              pathParams,
              queryParams,
            }
            if (requestMethod === 'POST' || requestMethod === 'PUT') {
              options.body = await request.json()
            }
            console.log(`[SW] IDB fetching: ${actualPath} -> ${handler.name}`)
            return await handler(options)
          } catch (error) {
            console.error(`[SW] IDB fetch failed for ${handler.name}, fall back to network:`, error)
            return fetch(request)
          }
        }
      }
    }
    console.log('[SW] Path not matched, fetching from Server', actualPath)
    return fetch(request)
  }
  return _idbOrNetwork
}
for (const method of Object.keys(idbApis) as HTTPMethod[]) {
  registerRoute(
    ({url}: {url: URL}) => {
      return url.pathname.startsWith('/api/music') && !isStaticResourcesFetch(url)
    },
    idbHandler(method),
    method
  )
}

self.skipWaiting()
clientsClaim()