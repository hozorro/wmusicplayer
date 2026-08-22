import { storeToRefs } from 'pinia'
import { getPlayerFacade } from '@/player/facade'

const f = getPlayerFacade()
  const { tracks, currentIndex, intent, engineState, order, position, mode } = storeToRefs(f.queue)

// —— DEV TOOLS ——
export function dump() {
  console.log('----- dump -----')
  console.log(`[tracks]${tracks.value.map(t => t.title).join(', ')}`)
  console.log(`[order]${order.value.join(', ')}`)
  console.log(`[curIdx]${currentIndex.value}`)
  console.log(`[position]${position.value}`)
  console.log(`[mode]${mode.value}`)
  console.log(`[intent]${intent.value}`)
  console.log(`[engineState]${engineState.value}`)
}