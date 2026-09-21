import { storeToRefs } from 'pinia'
import { getPlayerFacade } from '@/player/facade'

const f = getPlayerFacade()
  const { intent, engineState, mode } = storeToRefs(f.queue)

// —— DEV TOOLS ——
export function dump() {
  console.log('----- dump -----')
  console.log(`[mode]${mode.value}`)
  console.log(`[intent]${intent.value}`)
  console.log(`[engineState]${engineState.value}`)
}