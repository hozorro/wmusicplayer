// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import Tracks from '../Tracks.vue'

/** 真实度约束：method 必须是每次请求新建的对象（组件用 WeakMap 按实例标记代次） */
const h = vi.hoisted(() => ({
  routeParams: null as { sort?: string } | null,
  replace: vi.fn(),
  back: vi.fn(),
  urls: [] as string[],
  requests: [] as { method: { url: string }; page: number; sort: string }[],
  reload: vi.fn(),
  state: null as null | {
    data: { value: unknown[] }
    total: { value: number | undefined }
    page: { value: number }
    loading: { value: boolean }
    isLastPage: { value: boolean }
    emit: (e: unknown) => void
  },
  observerCb: null as null | ((entries: { isIntersecting: boolean }[]) => void),
  observed: null as HTMLElement | null,
  rectTop: 10000,
}))

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  const params = reactive<{ sort?: string }>({ sort: 'hot' })
  h.routeParams = params
  return {
    useRoute: () => ({ params }),
    useRouter: () => ({ replace: h.replace, back: h.back }),
  }
})
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/apis/methods/music', () => ({
  getTracksBySort: (sort: string, page: number, pageSize: number) => ({
    url: `/music/track/tracks?sort=${sort}&page=${page}&page_size=${pageSize}`
  })
}))
vi.mock('@/components/TrackList.vue', async () => {
  const { h: vnode } = await import('vue')
  return {
    default: {
      props: ['tracks', 'showArt'],
      render: (ctx: any) => vnode('div', { class: 'track-list-stub' },
        (ctx.tracks ?? []).map((t: any) => vnode('span', { key: t.id }, t.title)))
    }
  }
})

/**
 * 近似 alova usePagination：page 变化触发请求、reload 只发一次请求、
 * data/total 是跨请求共享状态、onSuccess 事件携带发出请求时的 method。
 */
vi.mock('alova/client', async () => {
  const { ref, watch } = await import('vue')
  return {
    usePagination: (
      fn: (p: number, size: number) => { url: string },
      config: { initialPage?: number; initialPageSize?: number; immediate?: boolean }
    ) => {
      const data = ref<unknown[]>([])
      const total = ref<number | undefined>(undefined)
      const page = ref(config.initialPage ?? 1)
      const pageSize = ref(config.initialPageSize ?? 10)
      const isLastPage = ref(false)
      const loading = ref(false)
      let successCb: (e: unknown) => void = () => {}

      const request = () => {
        const method = fn(page.value, pageSize.value)
        const sort = new URLSearchParams(method.url.split('?')[1] ?? '').get('sort') ?? ''
        h.urls.push(method.url)
        h.requests.push({ method, page: page.value, sort })
        loading.value = true
      }
      watch(page, () => request(), { flush: 'sync' })
      if (config.immediate !== false) request()

      h.state = {
        data, total, page, loading, isLastPage,
        emit: e => successCb(e),
      }
      return {
        data, total, page, pageSize, isLastPage, loading,
        reload: () => {
          h.reload()
          // 与 alova 一致：已在首页直接 send，否则重置 page 由 watcher 触发
          if (page.value === (config.initialPage ?? 1)) request()
          else page.value = config.initialPage ?? 1
          return Promise.resolve({})
        },
        onSuccess: (cb: (e: unknown) => void) => { successCb = cb },
      }
    }
  }
})

let apps: { unmount: () => void }[] = []

function mountTracks() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(Tracks)
  app.mount(host)
  apps.push(app)
  return host
}

const buttonByText = (host: HTMLElement, text: string) =>
  Array.from(host.querySelectorAll('button')).find(b => b.textContent?.includes(text))

const track = (id: number, title: string) => ({ id, title })

/** 模拟一次响应落库；sharedTotal 用于制造 alova 共享 total 被旧响应污染的场景 */
function deliver(
  method: { url: string },
  tracks: ReturnType<typeof track>[],
  total: number,
  sharedTotal = total
) {
  const s = h.state!
  s.data.value = tracks
  s.total.value = sharedTotal
  s.loading.value = false
  s.isLastPage.value = s.page.value * 20 >= total
  s.emit({ method, data: { total, tracks } })
}

const originalRect = HTMLElement.prototype.getBoundingClientRect

describe('Tracks.vue', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    apps = []
    h.routeParams!.sort = 'hot'
    h.urls.length = 0
    h.requests.length = 0
    h.state = null
    h.observed = null
    h.observerCb = null
    h.rectTop = 10000
    h.replace.mockReset()
    h.replace.mockImplementation((url: string) => {
      if (h.routeParams) h.routeParams.sort = url.split('/').pop()
    })
    h.back.mockReset()
    h.reload.mockReset()
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void, _opts?: unknown) {
        h.observerCb = cb
      }
      observe(el: HTMLElement) { h.observed = el }
      disconnect() { h.observed = null }
    })
    vi.stubGlobal('scrollTo', vi.fn())
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: h.rectTop, bottom: h.rectTop, left: 0, right: 0,
        width: 0, height: 0, x: 0, y: h.rectTop, toJSON: () => ({}),
      }),
    })
  })

  afterEach(() => {
    apps.forEach(app => app.unmount())
    apps = []
    document.body.innerHTML = ''
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true, value: originalRect,
    })
  })

  it('首屏按路由参数 sort 请求，并注册 sentinel 观察', async () => {
    mountTracks()
    await nextTick()   // watch(sentinel, ..., { flush: 'post' }) 在渲染后执行
    expect(h.urls[0]).toContain('sort=hot')
    expect(h.requests[0].page).toBe(1)
    expect(h.observed).toBeTruthy()
  })

  it('切换 tab 时更新 URL、重置列表并只发起一次重载请求', async () => {
    const host = mountTracks()
    deliver(h.requests[0].method, [track(1, 'A')], 1)
    await nextTick()
    expect(host.textContent).toContain('A')

    buttonByText(host, 'player.play_history')!.click()
    await nextTick()
    await nextTick()   // 让 route.params 的 watcher 有机会执行
    expect(h.replace).toHaveBeenCalledWith('/tracks/history')
    expect(h.reload).toHaveBeenCalledTimes(1)
    expect(h.urls).toHaveLength(2)
    expect(h.urls[1]).toContain('sort=history')
    expect(host.textContent).not.toContain('A')
  })

  it('onSuccess 把分页数据追加进列表，并丢弃旧代次响应', async () => {
    const host = mountTracks()
    const first = h.requests[0]
    deliver(first.method, [track(1, 'A')], 1)
    await nextTick()
    expect(host.textContent).toContain('A')

    buttonByText(host, 'player.latest_added')!.click()
    await nextTick()
    deliver(first.method, [track(2, 'STALE')], 2)
    await nextTick()
    expect(host.textContent).not.toContain('STALE')

    deliver(h.requests[1].method, [track(3, 'FRESH')], 1)
    await nextTick()
    expect(host.textContent).toContain('FRESH')
  })

  it('A→B→A 快速切换时，最早一代的迟到响应仍被丢弃', async () => {
    const host = mountTracks()
    const gen0 = h.requests[0].method
    buttonByText(host, 'player.latest_added')!.click()
    await nextTick()
    buttonByText(host, 'player.most_played')!.click()
    await nextTick()

    deliver(gen0, [track(9, 'STALE_GEN0')], 1)
    await nextTick()
    expect(host.textContent).not.toContain('STALE_GEN0')

    deliver(h.requests[h.requests.length - 1].method, [track(10, 'CURRENT')], 1)
    await nextTick()
    expect(host.textContent).toContain('CURRENT')
  })

  it('末页提示依据本次响应的 total，不受共享 total 污染', async () => {
    const host = mountTracks()
    deliver(h.requests[0].method, [track(1, 'A')], 1, 99)
    await nextTick()
    expect(host.textContent).toContain('common.page_load_complete')
    expect(host.textContent).toContain('player.unit_track')
  })

  it('IntersectionObserver 触发下一页并追加，到末页停止', async () => {
    const host = mountTracks()
    deliver(h.requests[0].method, [track(1, 'A'), track(2, 'B')], 3)
    await nextTick()
    expect(h.urls).toHaveLength(1)

    h.observerCb!([{ isIntersecting: true }])
    await nextTick()
    expect(h.urls).toHaveLength(2)
    expect(h.urls[1]).toContain('page=2')

    deliver(h.requests[1].method, [track(3, 'C')], 3)
    await nextTick()
    expect(host.textContent).toContain('C')
    expect(host.textContent).toContain('common.page_load_complete')

    h.observerCb!([{ isIntersecting: true }])
    await nextTick()
    expect(h.urls).toHaveLength(2)
  })

  it('视口未满时自动续载下一页', async () => {
    h.rectTop = 0
    mountTracks()
    deliver(h.requests[0].method, [track(1, 'A')], 5)
    await nextTick()
    await nextTick()
    expect(h.urls).toHaveLength(2)
    expect(h.urls[1]).toContain('page=2')
  })

  it('浏览器前进/后退改变路由参数时只重载一次', async () => {
    mountTracks()
    h.routeParams!.sort = 'latest'
    await nextTick()
    await nextTick()
    expect(h.reload).toHaveBeenCalledTimes(1)
    expect(h.urls).toHaveLength(2)
    expect(h.urls[1]).toContain('sort=latest')
  })

  it('非法 sort 归一化为 latest 并修正 URL', () => {
    h.routeParams!.sort = 'bogus'
    mountTracks()
    expect(h.urls[0]).toContain('sort=latest')
    expect(h.replace).toHaveBeenCalledWith('/tracks/latest')
  })
})
