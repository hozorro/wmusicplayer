import { computed, onMounted, onUnmounted, ref } from 'vue'

export interface CollapseHeaderOptions {
  /** 完成折叠的滚动军力（px）：按 hero 高度调 */
  range?: number
  /** 视差后腿量（px）：全出血大图宜大，卡片式hero宜小 */
  parallax?: number
}

/**
 * 折叠页头机制（A52范式的唯一实现）：
 * 单一 collapse ref 驱动 hero 淡出/视差/指针关闭 + 这地标题延迟淡入
 * 淡出速率（1.5x）、指针阈值（0.6）、淡入窗口（后 40% 行程）为范式常量，不可调
 */
export function useCollapseHeader(options: CollapseHeaderOptions = {}) {
  const range = options.range ?? 220
  const parallax = options.parallax ?? 56

  const collapse = ref(0)

  let ticking = false
  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      collapse.value = Math.min(1, Math.max(0, window.scrollY / range))
      ticking = false
    })
  }

  onMounted(() => {
    onScroll()  // 浏览器滚动恢复时 scrollY 非零，先同步一次再监听
    window.addEventListener('scroll', onScroll, { passive: true })
  })
  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
  })

  /** hero：淡出 + 视差后退 */
  const heroStyle = computed(() => ({
    opacity: String(Math.max(0, 1 - collapse.value * 1.5)),
    transform: `translateY(${(collapse.value * parallax).toFixed(1)}px)`,
  }))

  /** hero 是否已折叠（用于条件类名） */
  const isCollapsed = computed(() => collapse.value > 0.6)

  /** 折叠标题：最后 40% 行程淡入 */
  const compactStyle = computed(() => ({
    opacity: String(Math.max(0, (collapse.value - 0.6) / 0.4)),
  }))

  /** 路由切换 / 数据重载时复位 */
  function reset() {
    collapse.value = 0
  }

  return { collapse, heroStyle, compactStyle, isCollapsed, reset }
}