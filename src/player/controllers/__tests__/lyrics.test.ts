// player/controllers/__tests__/lyrics.test.ts
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { nextTick, ref, watch, type Ref } from 'vue'
import { createEmitter } from '@/shared/emitter'
import { createLyricController } from '../lyrics'
import { PlayerEvent } from '../../events'
import type { PlayerEventMap } from '../../events'
import type { PlayTrack } from '../../types'

const T = (id: number): PlayTrack => ({ id, title: `t${id}`, artists: [{id: 1, name: 'a' }] })

let bus: ReturnType<typeof createEmitter<PlayerEventMap>>
let time: Ref<number>
let fetchLyric: Mock<(trackId: number) => Promise<string>>

beforeEach(() => {
  bus = createEmitter<PlayerEventMap>()
  time = ref(0)
  fetchLyric = vi.fn<(trackId: number) => Promise<string>>()
})

const setup = () => createLyricController(bus, time, fetchLyric)

describe('认证取词与定位', () => {
  it('TrackChanged → 以 track.id 取词、解析、按当前时间定位', async () => {
    fetchLyric.mockResolvedValue('[00:05.00]早\n[00:12.00]中\n[00:20.00]晚')
    const lyrics = setup()
    time.value = 13
    bus.emit(PlayerEvent.TrackChanged, T(1))
    expect(fetchLyric).toHaveBeenCalledWith(1)
    await vi.waitFor(() => expect(lyrics.status.value).toBe('ready'))
    expect(lyrics.lines.value).toHaveLength(3)
    expect(lyrics.currentLine.value).toBe(1)      // 中途载入，立即定位
  })

  it('取词期间呈现 loading 态', () => {
    fetchLyric.mockReturnValue(new Promise(() => {}))   // 悬挂
    const lyrics = setup()
    bus.emit(PlayerEvent.TrackChanged, T(1))
    expect(lyrics.status.value).toBe('loading')
  })

  it('空歌词落 none 态', async () => {
    fetchLyric.mockResolvedValue('  \n   ')
    const lyrics = setup()
    bus.emit(PlayerEvent.TrackChanged, T(1))
    await vi.waitFor(() => expect(lyrics.status.value).toBe('none'))
    expect(lyrics.lines.value).toEqual([])
  })

  it('取词失败静默降级为 none（歌词非关键路径）', async () => {
    fetchLyric.mockRejectedValue(new Error('401 unauthorized'))
    const lyrics = setup()
    bus.emit(PlayerEvent.TrackChanged, T(1))
    await vi.waitFor(() => expect(lyrics.status.value).toBe('none'))
  })
})

describe('A40 写端去重', () => {
  it('同一行内的 time 抖动不触发 currentLine 写入', async () => {
    fetchLyric.mockResolvedValue('[00:05.00]甲\n[00:30.00]乙')
    const lyrics = setup()
    time.value = 6
    bus.emit(PlayerEvent.TrackChanged, T(1))
    await vi.waitFor(() => expect(lyrics.status.value).toBe('ready'))

    const spy = vi.fn()
    watch(lyrics.currentLine, spy)
    time.value = 6.25; await nextTick()
    time.value = 6.5;  await nextTick()
    expect(spy).not.toHaveBeenCalled()            // 4Hz 输入，零渲染
    time.value = 30.5; await nextTick()
    expect(spy).toHaveBeenCalledOnce()            // 跨行才写
  })
})

describe('A41 竞态守卫', () => {
  it('快速切歌：过期取词结果被静默丢弃', async () => {
    let releaseA!: (v: string) => void
    fetchLyric.mockImplementation((id: number) =>
      id === 1
        ? new Promise<string>(resolve => { releaseA = resolve })
        : Promise.resolve('[00:01.00]来自 B'),
    )
    const lyrics = setup()

    bus.emit(PlayerEvent.TrackChanged, T(1))      // A 的请求悬挂
    bus.emit(PlayerEvent.TrackChanged, T(2))      // B 先落地
    await vi.waitFor(() => expect(lyrics.lines.value[0]?.text).toBe('来自 B'))

    releaseA('[00:01.00]来自 A')                  // 过期结果姗姗来迟
    await Promise.resolve()
    expect(lyrics.lines.value[0]?.text).toBe('来自 B')   // 不被覆盖
  })
})