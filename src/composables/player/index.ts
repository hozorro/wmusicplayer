import { reactive, readonly } from "vue";
import { createAudioEngine } from "./audio-engine/engine";
import { EngineEvent } from "./audio-engine/events";
import type { PlayerTrack } from "./types";
import type { IAudioEngine, IAudioSourceProvider } from "./audio-engine/interfaces";
import type { EngineOptions } from "./audio-engine/types";
import { DEFAULT_ENGINE_OPTIONS } from "./constants";


interface CreatePlayerOptions {
  resolver: IAudioSourceProvider;
  engine?: Partial<EngineOptions>;
}

interface PlayState {
  initialized: boolean;
  playing: boolean;
}

function createPlayer(options: CreatePlayerOptions) {
  const engineOptions = { ...DEFAULT_ENGINE_OPTIONS, ...options.engine };
  const engine: IAudioEngine = createAudioEngine(options.resolver, engineOptions);
  const state = reactive<PlayState>({
    initialized: false,
    playing: false,
  });

  bindEngineEvents()

  function bindEngineEvents(): void {
    engine.eventBus.on(EngineEvent.Ready, () => {
      state.initialized = true;
    })
    engine.eventBus.on(EngineEvent.Destroy, () => {
      state.initialized = false;
      state.playing = false;
    })
    engine.eventBus.on(EngineEvent.Play, () => {
      state.playing = true;
    })
    engine.eventBus.on(EngineEvent.Pause, () => {
      state.playing = false;
    })
    engine.eventBus.on(EngineEvent.Stop, () => {
      state.playing = false;
    })
    engine.eventBus.on(EngineEvent.Error, () => {
      state.playing = false;
    })
  }

  function initialize(audioA: HTMLAudioElement, audioB: HTMLAudioElement): void {
    engine.initialize(audioA, audioB);
  }

  function destroy(): void {
    engine.destroy();
  }

  async function load(track: PlayerTrack): Promise<void> {
    await engine.load(track);
  }

  async function play(): Promise<void> {
    await engine.play();
  }

  async function pause(): Promise<void> {
    await engine.pause();
  }

  async function stop(): Promise<void> {
    await engine.stop();
  }

  return {
    state: readonly(state),
    initialize,
    destroy,
    load,
    play,
    pause,
    stop
  }
}

let player: ReturnType<typeof createPlayer> | null =null

export function usePlayer(options?: CreatePlayerOptions) {
  if (player) return player;
  if (!options) {
      throw new Error("Player has not been created.");
    }
  player = createPlayer(options);
  return player;
}



