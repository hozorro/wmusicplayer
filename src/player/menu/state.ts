import { ref } from 'vue'
import type { MenuSource } from './types'

/**
 * 模块级单例：出发点遍布各列表，Host 全局唯一
 * 与 facade 单例同构——菜单状态不属于任何组件
 */
const source = ref<MenuSource | null>(null)

export const entityMenuSource = source
export function openEntityMenu(s: MenuSource) { source.value =s }
export function closeEntityMenu() { source.value = null }
