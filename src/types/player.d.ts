declare interface Operation {
  label: string,
  action: () => void
}
declare interface PlayerOptions {
  stat_percent: number,
  switch_time: number,
  max_fail_count: number,
  isLoop: boolean,
  isAutoPlayNext: boolean,
  timeUpdateInterval: number
}
