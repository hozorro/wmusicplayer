import { ref } from 'vue'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export interface Toast { id: number; msg: string, kind: ToastKind }
const toasts = ref<Toast[]>([])
let seq = 0

export const activeToasts = toasts
export function toast(msg: string, kind: ToastKind = 'info', ms = 3200) {
  const id = ++seq
  toasts.value.push({ id, msg, kind })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, ms)
}