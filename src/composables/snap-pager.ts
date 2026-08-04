import { ref } from 'vue'

/** 横向 snap 分页器：scroll 位置 -> 页码； goTo 支持原点反向导航 */
export function useSnapPager() {
  const pager = ref<HTMLElement | null>(null)
  const activePage = ref(0)

  function onScroll(e: Event) {
    const el = e.target as HTMLElement
    if (el.clientWidth > 0) {
      activePage.value = Math.round(el.scrollLeft / el.clientWidth)
    }
  }

  function goTo(page: number) {
    const el = pager.value
    if (el) el.scrollTo({ left: page * el.clientWidth, behavior: 'smooth' })
  }

  return { pager, activePage, onScroll, goTo }
}