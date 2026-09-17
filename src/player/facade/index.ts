import { effectScope, ref } from "vue";
import { createEmitter } from "@/player/shared/emitter";
import { createAudioRuntime } from "../runtime";
import { useQueueStore } from "@/store/queue";
import { createPlayQueueController } from "../controllers/play-queue";
import { createPlaybackController } from "../controllers/playback";
import { createHitTracker } from "../controllers/hit-tracker";
import { createMediaSessionController } from "../controllers/media-session";
import { createStreamResolver } from "@/services/stream-resolver";
import { createCacheService } from "@/services/cache";
import { createPreloadController } from "../controllers/preload";
import { createLyricController } from "../controllers/lyrics";
import { getConfig } from "@/config/config-provider";
import type { PlayerEventMap } from "../events";
import type { PlayTrack, PlayerIntents } from "../types";
import { getStreamingUrl, getLyric } from "@/apis/methods/music";

export interface PlayerFacadeDeps {
  /** 曲库/API 层供给： trackId -> track 流地址。 适配 getStreamingUrl 的签名 */
  fetchStreamUrl: (trackId: number) => Promise<string>;
  fetchLyric: (trackId: number) => Promise<string>;
}

export function createPlayerFacade(deps: PlayerFacadeDeps) {
  const scope  = effectScope(true)  // app 级生命周期，脱离组件作用域

  const api = scope.run(() => {
    const config = getConfig()
    const bus = createEmitter<PlayerEventMap>();
    const runtime = createAudioRuntime(config);
    const queue = useQueueStore();
    queue.sanitize()
    const playQueue = createPlayQueueController(queue, bus);
    const resolver = createStreamResolver(deps.fetchStreamUrl);
    const time = ref(0);
    const cacheService = createCacheService(config);
    const playback = createPlaybackController(runtime, queue, resolver, cacheService, bus, time, config);
    const hitTracker = createHitTracker(queue, bus, time, config);
    const preload = createPreloadController(queue, bus, resolver, cacheService, config);
    const lyrics = createLyricController(bus, time, deps.fetchLyric);
    
    const intents: PlayerIntents = {
      play:   () => { queue.intent = 'play' },
      pause:  () => { queue.intent = 'pause' },
      toggle: () => { queue.intent = queue.intent === 'play' ? 'pause' : 'play' },
      /** 用户推进忽略 loop-one；position 写入后 watcher 接管 */
      next:   () => { if (queue.skipNext() === 'ended') queue.intent = 'pause' },
      prev:   () => {
        if (time.value > 3) {
          playback.seek(0)
          return  // 播放超 3s，重播
        }
        if (queue.retreat() === 'unchanged') playback.seek(0)
      },
      // —— 跨域用户意图：消费返回值 + 触发播放，零计算决策过程 ——
      playAt:     (trackIndex: number) => { 
        queue.jumpTo(trackIndex)
        queue.intent = 'play'
      },
      playTrack:  (track: PlayTrack) => {
        intents.playAt(playQueue.ensure(track))
      },
      addAndPlay: (tracks: PlayTrack[]) => {
        const { first } = playQueue.addMany(tracks)
        if (first >= 0) intents.playAt(first)
      },
      playAll:    (tracks: PlayTrack[], at = 0) => {
        playQueue.replace(tracks)
        intents.playAt(at)
      },
      playNext:     (track: PlayTrack) => { playQueue.insertNext(track) },
      playNextAll:  (tracks: PlayTrack[]) => { playQueue.insertNextMany(tracks) },
      seek:         (position: number) => { playback.seek(position) },
      setVolume:    (volume: number) => { playback.setVolume(volume) },
    }

    const mediaSession = createMediaSessionController(queue, bus, intents, time );

    return {
      bus, runtime, queue, playQueue, resolver, time, 
      playback, mediaSession, intents, preload, lyrics,
      dispose: () => { 
        scope.stop()
        preload.dispose()
        lyrics.dispose()
        if (mediaSession.supported) mediaSession.dispose()
        hitTracker.dispose()
        runtime.dispose()
        cacheService.dispose()
        bus.clear()
      }
    }
  })!

  return api
}

export type PlayerFacade = ReturnType<typeof createPlayerFacade>

// —— app 级单例 ——
let facade: PlayerFacade | null = null
let deps: PlayerFacadeDeps = { 
  fetchStreamUrl: async id => await getStreamingUrl(id).send(),
  fetchLyric: async id => await getLyric(id).send(),
}

/** maint.ts: app.use(pinia) 之后、mount之前调用 */
export function initPlayer(): PlayerFacade {
  return facade ??= createPlayerFacade(deps)
}

export function getPlayerFacade(): PlayerFacade {
  if (!facade) {
    throw new Error('Player facade is not initialized: call initPlayer after app.use(pinia) before app.mount()')
  }
  return facade
}
