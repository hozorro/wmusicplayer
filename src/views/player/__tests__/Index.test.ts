// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import Index from '../Index.vue'

const h = vi.hoisted(() => ({
  push: vi.fn(),
  emptySend: () => ({ send: async () => [] as unknown[] }),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: h.push }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('pinia', async () => {
  const { ref } = await import('vue')
  return { storeToRefs: () => ({ dailyLyric: ref(null) }) }
})
vi.mock('@/store/music', () => ({ useMusicStore: () => ({}) }))
vi.mock('@/composables/playback', () => ({ usePlayer: () => ({ playAll: vi.fn() }) }))
vi.mock('@/apis/methods/music', () => ({
  getTopPlaylists: h.emptySend,
  getTenArtists: h.emptySend,
  getModedRandomTracks: h.emptySend,
  getRandomGenres: h.emptySend,
  getLatestTracks: h.emptySend,
  getHotTracks: h.emptySend,
}))
vi.mock('@/services/random-model', () => ({ paramlessModes: [] }))
vi.mock('@/assets/imgs/favorite.jpg', () => ({ default: 'fav.jpg' }))
vi.mock('@/assets/imgs/fav_artists.jpg', () => ({ default: 'artists.jpg' }))

vi.mock('@/components/MediaCard.vue', () => ({ default: { render: () => null } }))
vi.mock('@/components/TrackRow.vue', () => ({ default: { render: () => null } }))
vi.mock('@/components/PagerDots.vue', () => ({ default: { render: () => null } }))
vi.mock('@/components/ModeIcon.vue', () => ({ default: { render: () => null } }))
vi.mock('@/components/MarqueeText.vue', () => ({ default: { render: () => null } }))

let apps: { unmount: () => void }[] = []

function mountIndex() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(Index)
  app.mount(host)
  apps.push(app)
  return host
}

describe('Index.vue 查看全部入口', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    apps = []
    h.push.mockReset()
    ;(HTMLElement.prototype as any).scrollTo = vi.fn()
  })

  afterEach(() => {
    apps.forEach(app => app.unmount())
    apps = []
    document.body.innerHTML = ''
  })

  it('最近添加 tab 时查看全部跳 /tracks/latest', async () => {
    const host = mountIndex()
    await nextTick()
    const btn = host.querySelector<HTMLButtonElement>('[data-testid="tracks-view-all"]')
    expect(btn).toBeTruthy()
    btn!.click()
    expect(h.push).toHaveBeenCalledWith('/tracks/latest')
  })

  it('切到最常播放后跳 /tracks/hot', async () => {
    const host = mountIndex()
    await nextTick()
    const tab = Array.from(host.querySelectorAll('button'))
      .find(b => b.textContent?.includes('player.most_played'))!
    tab.click()
    await nextTick()
    h.push.mockClear()
    host.querySelector<HTMLButtonElement>('[data-testid="tracks-view-all"]')!.click()
    expect(h.push).toHaveBeenCalledWith('/tracks/hot')
  })

  it('tab 区按钮与模块标题的查看全部使用同一组件样式', async () => {
    const host = mountIndex()
    await nextTick()
    const tabBtn = host.querySelector<HTMLButtonElement>('[data-testid="tracks-view-all"]')!
    const headerBtn = Array.from(host.querySelectorAll('button'))
      .find(b => b !== tabBtn && b.textContent?.includes('common.view_all'))!
    expect(headerBtn).toBeTruthy()
    expect(tabBtn.className).toBe(headerBtn.className)
  })
})
