import type { IAudioEngine } from "./audio-engine/interfaces";
import type { createPlaylist } from "./playlist"; // 临时使用，后续明确定义IPlaylist
import { EngineEvent, EngineEventBus, type EngineEventMap } from "./audio-engine/events";
import { SlotStatus } from "./audio-engine/types";
import { DEFAULT_PRELOAD_DELAY } from "./constants";

export interface IPreload {
  initialize(): void
  destroy(): void
  schedule(): void
  cancel(): void
}

export function createPreload(
  engine: IAudioEngine,
  playlist: ReturnType<typeof createPlaylist>,
  eventBus: EngineEventBus
): IPreload {
  let initialized = false;
  let destroyed = false;

  let timer: number | null = null;
  let offPlay: (() => void) | null = null;
  let offTimeUpdate: (() => void) | null = null;

  async function executePreload(): Promise<void> {
    if (!initialized || destroyed) return;

    const standby = engine.context.standbySlot
    if (!standby) return
    if (standby.status === SlotStatus.Loading || standby.status === SlotStatus.Ready) return

    const track = playlist.peekNext()
    if (!track) return

    try {
      await engine.preload(track);
    } catch (error) {
      console.error("Preload error:", error); //以后如果项目统一有 Logger，这里再替换成 Logger。
    }
  }

  function handlePlay(): void {
    schedule();
  }

  function handleTimeUpdate(payload: EngineEventMap[typeof EngineEvent.TimeUpdate]): void {
    const { currentTime, duration } = payload;
    if (duration <= 0) return
    
    if (currentTime / duration < 0.8) return

    void executePreload();
  }

  function schedule(): void {
    if (!initialized || destroyed) return;

    cancel();
    timer = window.setTimeout(async () => {
      timer = null;
      await executePreload();
    }, DEFAULT_PRELOAD_DELAY);
  }

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function initialize(): void {
    if (initialized || destroyed) return;

    offPlay = eventBus.on(EngineEvent.Play, handlePlay);
    offTimeUpdate = eventBus.on(EngineEvent.TimeUpdate, handleTimeUpdate);

    initialized = true;
  }

  function destroy(): void {
    if (destroyed) return;

    destroyed = true;
    cancel();
    offPlay?.();
    offPlay = null;
    offTimeUpdate?.();
    offTimeUpdate = null;
    initialized = false;
  }

  return {
    initialize,
    destroy,
    schedule,
    cancel
  }
}
