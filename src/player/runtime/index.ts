import { createEmitter } from "@/shared/emitter";
import { createSerialQueue } from "@/shared/serial-queue";
import { createEventBinder } from "./event-binder";
import { nativeHandlers } from "./native-handlers";
import type { EngineContext } from "./context";
import type { EngineEventMap } from "../events";

/** 加载超时：loadeddata永不触发时拒绝，防止单点挂起死锁整条队列 */
const LOAD_TIMEOUT_MS = 20000

/**
 * 音频运行时：单audio元素 + 串行操作队列 + 原生事件翻译层
 * 
 * 两条铁律：
 * 1. 元素由 JS 创建，不进组件树，生命周期 = app生命周期（iOS手势继承支点）
 * 2. 一切触碰 src/播放状态的操作入队串行；音量等无状态副作用可直达
 */
export function createAudioRuntime() {
  const el = document.createElement("audio");
  el.preload = "auto";

  const emitter = createEmitter<EngineEventMap>();
  const queue = createSerialQueue();
  const binder = createEventBinder(el);

  const ctx: EngineContext = { el, emit: emitter.emit };
  binder.bind(nativeHandlers, ctx);

  /**
   * 仅载入，不播放。用于 intent=pause 的载入场景
   * ⚠️播放中换曲禁止使用本方法——await loaddata 会制造“未请求播放”间隙
   * iOS standalone模式下，锁屏期间该间隙即进程终止窗口
   */
  function load(src: string): Promise<void> {
    return queue.enqueue(() => new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const cleanup = () => {
        if (timer !== undefined) clearTimeout(timer)
        el.removeEventListener("loadeddata", onLoaded)
        el.removeEventListener('error', onError)
      }
      const onLoaded = () => { cleanup(); resolve() }
      const onError = () => { cleanup(); reject(el.error ?? new Error(`media error: ${src}`)) }

      el.addEventListener("loadeddata", onLoaded)
      el.addEventListener('error', onError)
      timer = setTimeout(() => {
        cleanup()
        reject(new Error(`media load timeout (${LOAD_TIMEOUT_MS}ms): ${src}`))
      }, LOAD_TIMEOUT_MS)

      el.src = src
      el.load()
    }))
  }

  /**
   * 拒绝语义：
   * - NotAllowedError：缺手势授权（仅可能发生在首次用户激活之前）
   * - AbortError：被外部打断（串行队列内部不会产生打断）
   * 消费方区分处理：真实态一律以native事件回写为准，不以本promise为准
   */
  function play(): Promise<void> {
    return queue.enqueue(() => el.play())
  }

  /**
   * 换曲并播放：原子操作，src 与 play() 之间零间隙
   * 
   * iOS standalone的进程存活绑定于音频会话活跃度：
   * - ended 后若元素处于“未请求播放”状态等待缓冲，锁屏树苗内即被系统终止
   * - play() 内部自行等待缓冲，期间元素处于playbackRequested，会话保持活跃
   * 
   * 使用边界：所有“播放中换曲”（ended / next / prev / jump）一律走这里
   * load() 仅用于“载入但不播”的场景（冷启动恢复且 intent=pause）
   */
  function swapAndPlay(src: string): Promise<void> {
    return queue.enqueue(() => {
      el.src = src
      el.load()
      return el.play()  // 不等待loaddata，拒绝语义同play()
    })
  }

  function pause(): Promise<void> {
    return queue.enqueue(() => el.pause())
  }

  function seek(time: number): Promise<void> {
    return queue.enqueue(() => {
      const d = el.duration
      if (!Number.isFinite(d)) return 
      el.currentTime = Math.max(0, Math.min(time, d))
    })
  }

  /** 清空曲目（队列空了时由调和器调用）：暂停 + 释放资源 */
  function stop(): Promise<void> {
    return queue.enqueue(() => {
      el.pause()
      el.removeAttribute("src")
      el.load()
    })
  }

  /** 音量无状态副作用，不入队 */
  function setVolume(v: number): void {
    el.volume = Math.max(0, Math.min(v, 1))
  }

  function dispose(): void {
    binder.unbindAll()
    emitter.clear()
    el.removeAttribute("src")
    el.load()
  }

  return {
    load, play, swapAndPlay, pause, seek, stop, setVolume, dispose,
    on: emitter.on,
    off: emitter.off,
  }
}

export type AudioRuntime = ReturnType<typeof createAudioRuntime>
