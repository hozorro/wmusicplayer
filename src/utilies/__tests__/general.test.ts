import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  chunk,
  formatTime,
  generateTraceId,
  sample,
  shuffled,
  sleep,
  weightedSample,
} from '../general'

describe('shuffled', () => {
  it('返回新数组，不修改原数组', () => {
    const input = [1, 2, 3, 4, 5]
    const snapshot = [...input]
    const out = shuffled(input)
    expect(input).toEqual(snapshot)
    expect(out).not.toBe(input)
  })

  it('结果与原数组元素一致（仅顺序可能不同）', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const out = shuffled(input)
    expect(out).toHaveLength(input.length)
    expect([...out].sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b))
  })

  it('空数组返回空数组', () => {
    expect(shuffled([])).toEqual([])
  })

  it('单元素数组返回相同元素', () => {
    expect(shuffled([42])).toEqual([42])
  })

  it('支持 readonly 数组输入', () => {
    const input: readonly number[] = [1, 2, 3]
    const out = shuffled(input)
    expect(out).toHaveLength(3)
  })

  it('支持字符串元素', () => {
    const input = ['a', 'b', 'c']
    const out = shuffled(input)
    expect([...out].sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('sample', () => {
  it('返回 k 个元素', () => {
    const input = [1, 2, 3, 4, 5]
    const out = sample(input, 3)
    expect(out).toHaveLength(3)
  })

  it('k 大于数组长度时返回全部元素', () => {
    const input = [1, 2, 3]
    const out = sample(input, 10)
    expect(out).toHaveLength(3)
    expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3])
  })

  it('k 等于 0 时返回空数组', () => {
    expect(sample([1, 2, 3], 0)).toEqual([])
  })

  it('k 为负数时 slice 截断返回部分元素', () => {
    // Math.min(-1, 3) = -1，slice(0, -1) 去掉末尾1个元素
    expect(sample([1, 2, 3], -1)).toEqual([1, 2])
  })

  it('空数组返回空数组', () => {
    expect(sample([], 5)).toEqual([])
  })

  it('不修改原数组', () => {
    const input = [1, 2, 3, 4, 5]
    const snapshot = [...input]
    sample(input, 3)
    expect(input).toEqual(snapshot)
  })

  it('返回的元素均来自原数组', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const out = sample(input, 5)
    for (const item of out) {
      expect(input).toContain(item)
    }
  })

  it('返回的元素不重复', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const out = sample(input, 5)
    expect(new Set(out).size).toBe(out.length)
  })
})

describe('weightedSample', () => {
  it('返回 k 个元素', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const out = weightedSample(items, () => 1, 3)
    expect(out).toHaveLength(3)
  })

  it('k 大于数组长度时返回全部元素', () => {
    const items = ['a', 'b', 'c']
    const out = weightedSample(items, () => 1, 10)
    expect(out).toHaveLength(3)
  })

  it('k 等于 0 时返回空数组', () => {
    expect(weightedSample(['a', 'b'], () => 1, 0)).toEqual([])
  })

  it('k 为负数时返回空数组', () => {
    expect(weightedSample(['a', 'b'], () => 1, -1)).toEqual([])
  })

  it('空数组返回空数组', () => {
    expect(weightedSample([], () => 1, 5)).toEqual([])
  })

  it('权重为 0 或负数时按最小权重处理', () => {
    const items = ['a', 'b', 'c']
    // 不应抛错
    const out = weightedSample(items, () => 0, 2)
    expect(out).toHaveLength(2)
  })

  it('权重极大的元素大概率被选中', () => {
    // 使用固定 random 使测试确定性
    const items = ['heavy', 'light1', 'light2', 'light3', 'light4']
    const weights: Record<string, number> = {
      heavy: 10000,
      light1: 0.001,
      light2: 0.001,
      light3: 0.001,
      light4: 0.001,
    }
    // 多次采样，heavy 应几乎总是出现
    let heavyCount = 0
    const runs = 50
    for (let i = 0; i < runs; i++) {
      const out = weightedSample(items, (x) => weights[x], 1)
      if (out[0] === 'heavy') heavyCount++
    }
    // 权重比 10000:0.001，heavy 被选中的概率极高
    expect(heavyCount).toBeGreaterThan(runs * 0.8)
  })

  it('不修改原数组', () => {
    const items = ['a', 'b', 'c']
    const snapshot = [...items]
    weightedSample(items, () => 1, 2)
    expect(items).toEqual(snapshot)
  })
})

describe('chunk', () => {
  it('均分数组', () => {
    expect(chunk([1, 2, 3, 4, 5, 6], 2)).toEqual([[1, 2], [3, 4], [5, 6]])
  })

  it('不能整除时最后一组较短', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('size 大于数组长度时返回单组', () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]])
  })

  it('size 等于 1 时每个元素一组', () => {
    expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]])
  })

  it('空数组返回空数组', () => {
    expect(chunk([], 3)).toEqual([])
  })

  it('不修改原数组', () => {
    const input = [1, 2, 3, 4]
    const snapshot = [...input]
    chunk(input, 2)
    expect(input).toEqual(snapshot)
  })

  it('支持字符串元素', () => {
    expect(chunk(['a', 'b', 'c', 'd'], 3)).toEqual([['a', 'b', 'c'], ['d']])
  })
})

describe('formatTime', () => {
  it('0 秒返回 00:00', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('不足一分钟', () => {
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(59)).toBe('0:59')
  })

  it('超过一分钟', () => {
    expect(formatTime(60)).toBe('1:00')
    expect(formatTime(61)).toBe('1:01')
    expect(formatTime(125)).toBe('2:05')
  })

  it('超过一小时', () => {
    expect(formatTime(3600)).toBe('60:00')
    expect(formatTime(3661)).toBe('61:01')
  })

  it('秒数不足两位时补零', () => {
    expect(formatTime(65)).toBe('1:05')
  })

  it('负数返回 00:00', () => {
    expect(formatTime(-1)).toBe('00:00')
    expect(formatTime(-100)).toBe('00:00')
  })

  it('NaN 返回 00:00', () => {
    expect(formatTime(NaN)).toBe('00:00')
  })

  it('Infinity 返回 00:00', () => {
    expect(formatTime(Infinity)).toBe('00:00')
    expect(formatTime(-Infinity)).toBe('00:00')
  })

  it('小数秒数向下取整', () => {
    expect(formatTime(65.7)).toBe('1:05')
    expect(formatTime(59.9)).toBe('0:59')
  })
})

describe('sleep', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('返回 Promise', () => {
    const p = sleep(0)
    expect(p).toBeInstanceOf(Promise)
    return p
  })

  it('在指定时间后 resolve', async () => {
    vi.useFakeTimers()
    let resolved = false
    const p = sleep(1000).then(() => { resolved = true })
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    await p
    expect(resolved).toBe(true)
  })

  it('0ms 延迟也能 resolve', async () => {
    vi.useFakeTimers()
    let resolved = false
    const p = sleep(0).then(() => { resolved = true })
    await vi.advanceTimersByTimeAsync(0)
    await p
    expect(resolved).toBe(true)
  })
})

describe('generateTraceId', () => {
  it('返回字符串', () => {
    const id = generateTraceId()
    expect(typeof id).toBe('string')
  })

  it('返回有效的 UUID 格式', () => {
    const id = generateTraceId()
    // UUID v4 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('每次调用生成不同的 ID', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()))
    expect(ids.size).toBe(100)
  })

  it('当 crypto.randomUUID 不可用时使用降级方案', () => {
    const originalRandomUUID = crypto.randomUUID
    // 临时移除 randomUUID
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, writable: true, configurable: true })
    try {
      const id = generateTraceId()
      expect(typeof id).toBe('string')
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: originalRandomUUID, writable: true, configurable: true })
    }
  })
})
