// handler 侧契约，随数据层

export const MISS = Symbol('idb-miss')

export interface RouteCtx {
  params: Record<string, string>
  query: URLSearchParams
}

export type ApiHandler = (ctx: RouteCtx) => Promise<Response | typeof MISS>

/** 与后端 FastAPI ResponseModel(code/msg/data) 对齐；页面 alova 管道按 code 校验并解包 data */
export interface ResponseModel<T = unknown> {
  code: number
  msg: string
  data: T | null
}

export const json = <T>(data: T): Response => new Response(
  JSON.stringify({ code: 200, msg: 'ok', data } satisfies ResponseModel<T>), 
  {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }
)
