// player/menu/__tests__/definitions.test.ts
import { describe, expect, it, vi } from 'vitest'
import { MENU_ACTIONS, KIND_LABEL } from '../definitions'
import type { MenuContext } from '../context'
import type { MenuSource } from '../types'

const T = { id: 7, title: 't7', artists: [{id: 1, name: 'a'}] }
const ctx = (): MenuContext => ({
  player: { playTrack: vi.fn(), playNext: vi.fn(), addAndPlay: vi.fn(), playAll: vi.fn(), playNextAll: vi.fn() },
  playQueue: { add: vi.fn(), addMany: vi.fn(), move: vi.fn(), insertNext: vi.fn(), removeAt: vi.fn() },
  resolveTracks: vi.fn().mockResolvedValue([T]),
  openPanel: vi.fn(),
}) as unknown as MenuContext

const run = (kind: keyof typeof MENU_ACTIONS, key: string, s: MenuSource, c = ctx()) =>
  MENU_ACTIONS[kind].find(a => a.key === key)!.run(s, c)

describe('动作表接线', () => {
  it('track：下一首播放直达 playNext(track)', async () => {
    const c = ctx()
    await run('track', 'play-next', { kind: 'track', track: T }, c)
    expect(c.player.playNext).toHaveBeenCalledWith(T)
  })

  it('queue-track：置顶 = move(index, 0)；删除标记 danger', async () => {
    const c = ctx()
    const src: MenuSource = { kind: 'queue-track', track: T, index: 3 }
    await run('queue-track', 'pin-top', src, c)
    expect(c.playQueue.move).toHaveBeenCalledWith(3, 0)
    expect(MENU_ACTIONS['queue-track'].find(a => a.key === 'remove')!.danger).toBe(true)
  })

  it('collection：resolves 动作经 resolveTracks 供给', async () => {
    const c = ctx()
    const src: MenuSource = { kind: 'album', id: 1, title: '专辑', resolveTracks: c.resolveTracks as never }
    await run('album', 'play-all', src, c)
    expect(c.resolveTracks).toHaveBeenCalledOnce()
    expect(c.player.playAll).toHaveBeenCalledWith([T])
  })

  it('添加到歌单：唤起面板栈且保持打开', async () => {
    const c = ctx()
    const action = MENU_ACTIONS.track.find(a => a.key === 'add-playlist')!
    await action.run({ kind: 'track', track: T }, c)
    expect(c.openPanel).toHaveBeenCalledWith('playlist-picker')
    expect(action.keepsOpen).toBe(true)
  })

  it('八类 kind 全部在册，标题无缺', () => {
    expect(Object.keys(MENU_ACTIONS)).toHaveLength(8)
    for (const kind of Object.keys(MENU_ACTIONS)) {
      expect(MENU_ACTIONS[kind as keyof typeof MENU_ACTIONS].length).toBeGreaterThan(0)
      expect(KIND_LABEL[kind as keyof typeof MENU_ACTIONS]).toBeTruthy()
    }
  })
})