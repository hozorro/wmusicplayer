// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { RANDOM_MODES, paramModes, paramlessModes } from '@/services/random-model'
import { getModedRandomTracks, getLatestTracks, getHotTracks } from '@/apis/methods/music'
import { HOME_TRACK_COUNT } from '@/config/player-config'

describe('fresh 新鲜模式', () => {
  it('注册为带参模式，滑块范围 100~1000 / step 100 / 默认 500', () => {
    const fresh = RANDOM_MODES.find(m => m.key === 'fresh')
    expect(fresh).toBeDefined()
    expect(fresh!.param).toMatchObject({ min: 100, max: 1000, step: 100, defaultValue: 500 })
    expect(paramModes.some(m => m.key === 'fresh')).toBe(true)
  })

  it('首页三个零参直达按钮不变', () => {
    expect(paramlessModes.slice(0, 3).map(m => m.key)).toEqual(['pure', 'artist-r', 'unhit'])
  })

  it('getModedRandomTracks 生成 num=50 与 pool 参数的 URL', () => {
    const method = getModedRandomTracks('fresh', 500)
    expect(method.url).toContain('/music/track/rndfreshtracks')
    expect(method.url).toContain('num=50')
    expect(method.url).toContain('pool=500')
  })
})

describe('4 个高级随机端点的前端接线', () => {
  it('各模式落到对应后端端点并携带 num / numpa / weight', () => {
    expect(getModedRandomTracks('artist-r').url).toContain('/music/track/rndartisttracks?num=50&numpa=1')
    expect(getModedRandomTracks('artist-c', 3).url).toContain('/music/track/rndartisttracks?num=50&numpa=3')
    expect(getModedRandomTracks('unhit').url).toContain('/music/track/rndunhittracks?num=50')
    expect(getModedRandomTracks('artist-w', 6).url).toContain('/music/track/rndwgttracks?num=50&weight=6')
    expect(getModedRandomTracks('heat', 4).url).toContain('/music/track/rndhitswgttracks?num=50&weight=4')
  })

  it('首页两条列表显式带上统一条数（与后端默认 16 一致）', () => {
    expect(HOME_TRACK_COUNT).toBe(16)
    expect(getLatestTracks().url).toContain(`latesttracks?num=${HOME_TRACK_COUNT}`)
    expect(getHotTracks().url).toContain(`mostplayedtracks?num=${HOME_TRACK_COUNT}`)
    expect(getLatestTracks(5).url).toContain('num=5')
    expect(getHotTracks(7).url).toContain('num=7')
  })
})
