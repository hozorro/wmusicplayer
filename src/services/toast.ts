import { ref } from 'vue'

export interface Toast { id: number; msg: string }
const toasts = ref<Toast[]>([])
let seq = 0

export const activeToasts = toasts
export function toast(msg: string, ms = 3200) {
  const id = ++seq
  toasts.value.push({ id, msg })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, ms)
}