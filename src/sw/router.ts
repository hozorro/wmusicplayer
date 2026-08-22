// sw router 分发机制，随运行时层
import { MISS, type ApiHandler } from "@/idb/sw-api/contract";
import { idbReadyForSw } from "./idb-ready";

interface RouteRef {
  pattern: RegExp
  keys: string[]
  handler: ApiHandler
}

const routes: RouteRef[] = []

export function route(path: string, handler: ApiHandler) {
  const keys: string[] = []
  const pattern = new RegExp(
    '^' + path.replace(/:[^/]+/g, m => { keys.push(m.slice(1)); return '([^/]+)' }) + '$'
  )
  routes.push({ pattern, keys, handler })
}

/** 
 * 未就绪：全量头春（IDB不参与）
 * MISS 与异常一律回落网络——原始 Request 透传，已携带 alova 全部请求配置 
 */
export async function routeApi(request: Request): Promise<Response> {
  if (!(await idbReadyForSw())) return fetch(request)

  const url = new URL(request.url)
  for (const { pattern, keys, handler } of routes) {
    const match = pattern.exec(url.pathname)
    if (!match) continue
    const params: Record<string, string> = {}
    keys.forEach((key, i) => params[key] = match[i + 1])
    try {
      const res = await handler({ params, query: url.searchParams })
      if (res !== MISS) return res
    } catch { /* 本地异常，回落网络*/ }
    break
  }
  // 兜底 = 原始 Request 透传：该对象已携带页面 alova 的全部请求侧配置（token 等）；
  // 响应回传后将重新进入页面 alova 管道（transform / 401 刷新等），SW 不得代行（A82）
  return fetch(request)
}
