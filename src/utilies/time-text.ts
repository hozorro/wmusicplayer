import dayjs from "dayjs";

const nowTime = dayjs()
const monthDict: Record<number, string> = {
  1: '凛冬',
  2: '早春',
  3: '春天',
  4: '暮春',
  5: '初夏',
  6: '仲夏',
  7: '盛夏',
  8: '初秋',
  9: '秋天',
  10: '深秋',
  11: '初冬',
  12: '冬天'
}
const timeDict = {
  '凌晨': [1,2,3,4,5],
  '清早': [6,7],
  '上午': [8,9,10,11],
  '中午': [12,13],
  '下午': [14,15,16,17],
  '黄昏': [18,19],
  '晚上': [20,21,22],
  '深夜': [23,0]
}
const timeWord = (timeNum: number | undefined) => {
  if (timeNum === undefined) return '某个神秘时刻'
  for (const [time, nums] of Object.entries(timeDict)) {
    if (nums.includes(timeNum)) return time
  }
  return '某个神秘时刻'
}

const yearWord = (dt: dayjs.Dayjs) => {
  const dtYear = dt.year()
  const nowYear = nowTime.year()
  if (dtYear === nowYear) return '今年'
  if (dtYear === nowYear - 1) return '去年'
  if (dtYear === nowYear - 2) return '前年'
  return (nowYear - dtYear).toString() + '年前'
}
const getMostHitHourNum = (hits: string[]) => {
  const hitCounts = hits.map(hit => dayjs(hit).hour())
  const hitCountsMap = hitCounts.reduce((map: Record<number, number>, count) => {
    map[count] = (map[count] || 0) + 1
    return map
  }, {})
  const maxCount = Math.max(...Object.values(hitCountsMap))
  const maxCountHour = Object.keys(hitCountsMap).find(key => hitCountsMap[parseInt(key)] === maxCount)
  if (maxCountHour) return parseInt(maxCountHour)
  else return undefined
}
export function getISOWithOffset(date = new Date()) {
  const pad = (num: number) => String(num).padStart(2, '0');
  const offset = date.getTimezoneOffset(); // 分钟
  const absOffset = Math.abs(offset);
  const sign = offset > 0 ? '-' : '+';
  return [
    date.getFullYear(), '-', pad(date.getMonth() + 1), '-', pad(date.getDate()),
    'T', pad(date.getHours()), ':', pad(date.getMinutes()), ':', pad(date.getSeconds()),
    '.', String(date.getMilliseconds()).padStart(3, '0'),
    sign, pad(Math.floor(absOffset / 60)), ':', pad(absOffset % 60)
  ].join('');
}
export function timeText (dt: dayjs.Dayjs) {
  if (dt.year() == nowTime.year()) {
    if (dt.month() == nowTime.month()) {
      if (dt.date() == nowTime.date()) {
        return `今天`
      } else {
        return `${nowTime.date() - dt.date()}天前`
      }
    } else {
      return `${nowTime.month() - dt.month()}个月前`
    }
  }
  const yrWord = yearWord(dt)
  const monWord = monthDict[dt.month() + 1]
  const hrNum = dt.hour()
  const tmWord = timeWord(hrNum)
  return `在${yrWord}一个${monWord}的${tmWord}`
}

export function parseHits(hits: string[] | undefined) {
  if (!hits) return '你还没有听过这首歌'
  if (hits.length === 0) return '你还没有听过这首歌'

  const [earliest, latest] = hits.reduce((acc, hit) => {
    const hitTime = dayjs(hit)
    if (hitTime.isBefore(acc[0])) acc[0] = hitTime
    if (hitTime.isAfter(acc[1])) acc[1] = hitTime
    return acc
  }, [dayjs(hits[0]), dayjs(hits[0])])

  let hitText = `${timeText(earliest)}\n你第一次听了这首歌\n`
  
  if (earliest.isSame(latest)) return hitText + '\n之后，你没有再听这首歌'

  const count = hits.length
  if (count == 2) {
    if (latest.year() === earliest.year() && nowTime.month() - latest.month() < 2) 
      return `${hitText}\n最近，你又听了这首歌`
    else return hitText + `\n之后，直到${timeText(latest)}\n你才第二次听了这首歌`
  } else if (count < 6) {
    return `${hitText}\n之后，你听得不多\n\n${timeText(latest)}\n你最近一次听了这首歌`
  } else if (count > 5) {
    const mostHitHourNum = getMostHitHourNum(hits)
    return `${hitText}\n之后，你又听了${count - 1}次\n经常在${timeWord(mostHitHourNum)}听这首歌\n\n${timeText(latest)}\n你最近一次听了这首歌。`
  }
}