import { describe, it, expect } from 'vitest'
import {
  isNumberic,
  shuffle,
  secToHMS,
  timeStampToDate,
  getISOWithOffset,
  isTokenExpired,
  topWeightedLnRandom,
  dynamicSort,
} from '@/utilies/general'

describe('isNumberic', () => {
  it('returns true for pure digit strings', () => {
    expect(isNumberic('123')).toBe(true)
    expect(isNumberic('0')).toBe(true)
    expect(isNumberic('007')).toBe(true)
  })

  it('returns false for non-digit strings', () => {
    expect(isNumberic('12a')).toBe(false)
    expect(isNumberic('abc')).toBe(false)
    expect(isNumberic('-1')).toBe(false)
    expect(isNumberic('1.5')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isNumberic('')).toBe(false)
  })
})

describe('shuffle', () => {
  it('keeps the same length', () => {
    const arr = [1, 2, 3, 4, 5]
    shuffle(arr)
    expect(arr.length).toBe(5)
  })

  it('keeps all original elements', () => {
    const arr = [1, 2, 3, 4, 5]
    const copy = [...arr]
    shuffle(arr)
    expect(arr.sort((a, b) => a - b)).toEqual(copy.sort((a, b) => a - b))
  })

  it('modifies the array in place', () => {
    const arr = [1, 2, 3, 4, 5]
    const ref = arr
    shuffle(arr)
    expect(arr).toBe(ref) // same reference
  })

  it('handles empty and single-element arrays', () => {
    const empty: number[] = []
    shuffle(empty)
    expect(empty).toEqual([])

    const single = [42]
    shuffle(single)
    expect(single).toEqual([42])
  })
})

describe('secToHMS', () => {
  it('converts 0 to "00:00"', () => {
    expect(secToHMS(0)).toBe('00:00')
  })

  it('converts 59 seconds to "00:59"', () => {
    expect(secToHMS(59)).toBe('00:59')
  })

  it('converts 60 seconds to "01:00"', () => {
    expect(secToHMS(60)).toBe('01:00')
  })

  it('converts 3600 seconds to "01:00:00"', () => {
    expect(secToHMS(3600)).toBe('01:00:00')
  })

  it('converts large values to HH:MM:SS', () => {
    // 1h 23m 45s = 3600 + 1380 + 45 = 5025
    expect(secToHMS(5025)).toBe('01:23:45')
  })

  it('handles values under 10 minutes with zero padding', () => {
    expect(secToHMS(305)).toBe('05:05')
  })
})

describe('timeStampToDate', () => {
  it('returns "--" for timestamp 0', () => {
    expect(timeStampToDate(0)).toBe('--')
  })

  it('returns formatted date string for valid timestamp', () => {
    // Use a fixed UTC timestamp: 2024-01-15 00:00:00 UTC = 1705276800
    // The exact output depends on local timezone, so we just check the format
    const ts = 1705276800
    const result = timeStampToDate(ts)
    // Should match YYYY-MM-DD HH:mm:ss format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})

describe('getISOWithOffset', () => {
  it('returns ISO string with timezone offset', () => {
    const date = new Date('2024-06-15T10:30:00.000Z')
    const result = getISOWithOffset(date)
    // Should contain T separator and timezone offset (+ or -)
    expect(result).toMatch(/T/)
    expect(result).toMatch(/[+-]\d{2}:\d{2}$/)
  })

  it('includes milliseconds', () => {
    const date = new Date(2024, 5, 15, 10, 30, 45, 123)
    const result = getISOWithOffset(date)
    expect(result).toContain('.123')
  })
})

describe('isTokenExpired', () => {
  function makeJWT(exp: number | null): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = exp !== null
      ? btoa(JSON.stringify({ sub: 'user1', exp }))
      : btoa(JSON.stringify({ sub: 'user1' }))
    const sig = 'fake_signature'
    return `${header}.${payload}.${sig}`
  }

  it('returns true for empty string', () => {
    expect(isTokenExpired('')).toBe(true)
  })

  it('returns true for invalid token structure', () => {
    expect(isTokenExpired('not.a.valid.token')).toBe(true)
    expect(isTokenExpired('justonepart')).toBe(true)
  })

  it('returns true when token has no exp field', () => {
    const token = makeJWT(null)
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns true for expired token', () => {
    // exp = 1 second ago
    const token = makeJWT(Math.floor(Date.now() / 1000) - 1)
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns false for valid (non-expired) token', () => {
    // exp = 1 hour from now
    const token = makeJWT(Math.floor(Date.now() / 1000) + 3600)
    expect(isTokenExpired(token)).toBe(false)
  })
})

describe('topWeightedLnRandom', () => {
  const items = [
    { name: 'a', track_count: 100 },
    { name: 'b', track_count: 50 },
    { name: 'c', track_count: 10 },
    { name: 'd', track_count: 5 },
    { name: 'e', track_count: 1 },
  ]

  it('returns the requested count', () => {
    const result = topWeightedLnRandom(items, 3, 'track_count', 5)
    expect(result.length).toBe(3)
  })

  it('returns at most count items and not more than array length', () => {
    const result = topWeightedLnRandom(items, 10, 'track_count', 5)
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(items.length)
  })

  it('returns items from the original array', () => {
    const result = topWeightedLnRandom(items, 3, 'track_count', 5)
    for (const item of result) {
      expect(items).toContain(item)
    }
  })

  it('handles items with zero weight', () => {
    const zeroItems = [
      { name: 'a', hit_count: 0 },
      { name: 'b', hit_count: 0 },
    ]
    const result = topWeightedLnRandom(zeroItems, 2, 'hit_count', 5)
    expect(result.length).toBe(2)
  })
})

describe('dynamicSort', () => {
  const items = [
    { name: 'Charlie', age: 30 },
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 35 },
  ]

  it('sorts ascending by default', () => {
    const sorted = [...items].sort(dynamicSort('name'))
    expect(sorted.map(i => i.name)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('sorts ascending explicitly', () => {
    const sorted = [...items].sort(dynamicSort('age', 'asc'))
    expect(sorted.map(i => i.age)).toEqual([25, 30, 35])
  })

  it('sorts descending', () => {
    const sorted = [...items].sort(dynamicSort('age', 'desc'))
    expect(sorted.map(i => i.age)).toEqual([35, 30, 25])
  })

  it('handles equal values', () => {
    const items = [{ v: 1 }, { v: 1 }, { v: 2 }]
    const sorted = [...items].sort(dynamicSort('v'))
    expect(sorted[2].v).toBe(2)
  })
})
