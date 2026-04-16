import dayjs from "dayjs";
import { t } from "./use-i18n";

const nowTime = dayjs()
const monthDict: Record<number, string> = {
  1: t('sentence.month_1'),
  2: t('sentence.month_2'),
  3: t('sentence.month_3'),
  4: t('sentence.month_4'),
  5: t('sentence.month_5'),
  6: t('sentence.month_6'),
  7: t('sentence.month_7'),
  8: t('sentence.month_8'),
  9: t('sentence.month_9'),
  10: t('sentence.month_10'),
  11: t('sentence.month_11'),
  12: t('sentence.month_12')
}
const timeDict = [
  { label: t('sentence.early_morning'), value: [1,2,3,4,5] },
  { label: t('sentence.dawn'), value: [6,7] },
  { label: t('sentence.morning'), value: [8,9,10,11] },
  { label: t('sentence.noon'), value: [12,13] },
  { label: t('sentence.afternoon'), value: [14,15,16,17] },
  { label: t('sentence.dusk'), value: [18,19] },
  { label: t('sentence.evening'), value: [20,21,22] },
  { label: t('sentence.night'), value: [23,0]}
]
const timeWord = (timeNum: number | undefined) => {
  if (timeNum === undefined) return t('sentence.unknown_time')
  for (let i = 0; i < timeDict.length; i++) {
    const time = timeDict[i]
    if (time.value.includes(timeNum)) return time.label
  }
  return t('sentence.unknown_time')
}

const yearWord = (dt: dayjs.Dayjs) => {
  const dtYear = dt.year()
  const nowYear = nowTime.year()
  if (dtYear === nowYear) return t('sentence.this_year')
  if (dtYear === nowYear - 1) return t('sentence.last_year')
  if (dtYear === nowYear - 2) return t('sentence.before_last_year')
  return t('sentence.year_before', { year: nowYear - dtYear })
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
export function timeText (dt: dayjs.Dayjs) {
  if (dt.year() == nowTime.year()) {
    if (dt.month() == nowTime.month()) {
      if (dt.date() == nowTime.date()) {
        return t('sentence.today')
      } else {
        return t('sentence.day_before', { day: nowTime.date() - dt.date() })
      }
    } else {
      return t('sentence.month_before', { month: nowTime.month() - dt.month() })
    }
  }
  const yrWord = yearWord(dt)
  const monWord = monthDict[dt.month() + 1]
  const hrNum = dt.hour()
  const tmWord = timeWord(hrNum)
  return t('sentence.time_detail', { year: yrWord, month: monWord, time: tmWord })
}

export function parseHits(hits: string[] | undefined) {
  if (!hits) return t('sentence.not_listened')
  if (hits.length === 0) return t('sentence.not_listened')

  const [earliest, latest] = hits.reduce((acc, hit) => {
    const hitTime = dayjs(hit)
    if (hitTime.isBefore(acc[0])) acc[0] = hitTime
    if (hitTime.isAfter(acc[1])) acc[1] = hitTime
    return acc
  }, [dayjs(hits[0]), dayjs(hits[0])])

  let hitText = `${timeText(earliest)}\n${t('sentence.first_listened')}\n`
  
  if (earliest.isSame(latest)) return hitText + `\n${t('sentence.then_not_listened')}`

  const count = hits.length
  if (count == 2) {
    if (latest.year() === earliest.year() && nowTime.month() - latest.month() < 2) 
      return `${hitText}\n${t('sentence.recent_listened')}`
    else return hitText + t('sentence.then_second_listened', { full_time: timeText(latest) })
  } else if (count < 6) {
    return `${hitText}${t('sentence.then_recent_listened'), { full_time: timeText(latest) }}`
  } else if (count > 5) {
    const mostHitHourNum = getMostHitHourNum(hits)
    return `${hitText}${t('sentence.then_often_listened', { 
      count: count - 1, 
      time: timeWord(mostHitHourNum),
      full_time: timeText(latest)
    })}`
  }
}