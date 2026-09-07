import { ref, onMounted, onUnmounted } from 'vue'
import { getPlayerFacade } from '@/player/facade'
import { PlayerEvent } from '@/player/events'
import type { EngineState } from '@/player/types'

/** 活跃态：出声或即将出声。此时不打断用户，等待首次退出活跃态再提示 */
const ACTIVE_STATES: readonly EngineState[] = ['playing', 'buffering', 'loading']

export function usePWAUpdate() {
  const updateAvailable = ref(false)
  const updating = ref(false)
  const dismissed = ref(false)
  let registration: ServiceWorkerRegistration | null = null
  let checkInterval: ReturnType<typeof setInterval> | null = null
  let offStateChange: (() => void) | null = null

  /**
   * 更新就绪的统一入口：
   * - 未在播放：立即提示
   * - 正在播放：订阅 StateChanged，首次退出活跃态时提示并自取消
   * 幂等：已提示 / 已订阅等待中 直接返回
   */
  function revealUpdate() {
    if (updateAvailable.value || offStateChange) return

    let bus: ReturnType<typeof getPlayerFacade>['bus']
    let engineState: EngineState
    try {
      const facade = getPlayerFacade()
      bus = facade.bus
      engineState = facade.queue.engineState
    } catch {
      // facade 未初始化等异常：降级为立即提示
      updateAvailable.value = true
      return
    }

    if (!ACTIVE_STATES.includes(engineState)) {
      updateAvailable.value = true
      return
    }

    offStateChange = bus.on(PlayerEvent.StateChanged, (s) => {
      if (!ACTIVE_STATES.includes(s)) {
        updateAvailable.value = true
        offStateChange?.()
        offStateChange = null
      }
    })
  }

  onMounted(async () => {
    if (!('serviceWorker' in navigator)) return

    registration = await navigator.serviceWorker.ready

    // 检测是否有 waiting 状态的 SW （即新版本已下载但未激活）
    if (registration.waiting) {
      revealUpdate()
      return
    }

    // 监听 SW 更新事件
    registration.addEventListener('updatefound', () => {
      const newWorker = registration!.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 新版本已安装，等待用户刷新
          revealUpdate()
        }
      })
    })

    // 监听来自 SW 的消息（备用通道）
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'SW_UPDATED') {
        revealUpdate()
      }
    })

    // 定期主动检查更新
    checkInterval = setInterval(() => {
      registration?.update()
    }, 30 * 60 * 1000)
  })

  onUnmounted(() => {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
    offStateChange?.()
    offStateChange = null
  })

  /**
   * 应用更新
   * 核心逻辑：保存播放状态 -> 通知 SW 激活 -> 刷新页面 -> 恢复播放
   */
  async function applyUpdate() {
    if (!registration?.waiting || updating.value) return

    updating.value = true

    try {
      // 1. 保存当前播放状态到 sessionStorage
      // 已在queueStore中持久化，在facade中自动恢复

      // 2. 监听 SW 接管完成事件
      const controllerChange = new Promise<void>(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange',
          () => resolve(),
          { once: true }
        )
      })

      // 3. 通知 SW 跳过等待，立即激活
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })

      // 4. 等待新 SW 接管
      await controllerChange

      // 5. 刷新页面（新 SW 会接管）
      window.location.reload()
    } catch (error) {
      console.error('[PWA] update failed:', error)
      updating.value = false
    }
  }

  /** 稍后：仅隐藏本次提示，不清除 updateAvailable（订阅已自取消） */
  function deferUpdate() {
    dismissed.value = true
  }

  return {
    updateAvailable,
    updating,
    dismissed,
    applyUpdate,
    deferUpdate,
  }
}
