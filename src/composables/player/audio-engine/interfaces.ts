/**
 * Audio Engine Public Interfaces
 */

import type { PlayerTrack, AudioCommand } from '../types'
import type { AudioSlot, EngineOptions, EngineContext, LoadResult, PlayResult, TransitionResult } from './types'
import { EngineEventBus } from './events'

/* -------------------------------------------------------------------------- */
/* Command Queue                                                              */
/* -------------------------------------------------------------------------- */

export interface ICommandQueue {
  enqueue(command: AudioCommand): Promise<void>
  clear(): void
  cancel(): void
  size(): number
}

/* ------------------------------------------------------------------------- */
/* Audio Binder                                                              */
/* ------------------------------------------------------------------------- */

export interface IAudioBinder {
    bind(slot:AudioSlot):void
    unbind(slot:AudioSlot):void
    reset(slot:AudioSlot):void
    destroy():void
}

/* -------------------------------------------------------------------------- */
/* Audio Event Handler                                                        */
/* -------------------------------------------------------------------------- */

export interface AudioEventHandler {
    onLoadStart?(slot:AudioSlot, event:Event):void
    onLoadedMetadata?(slot:AudioSlot, event:Event):void
    onCanPlay?(slot:AudioSlot, event:Event):void
    onPlay?(slot:AudioSlot, event:Event):void
    onPause?(slot:AudioSlot, event:Event):void
    onTimeUpdate?(slot:AudioSlot, event:Event):void
    onWaiting?(slot:AudioSlot, event:Event):void
    onSeeking?(slot:AudioSlot, event:Event):void
    onSeeked?(slot:AudioSlot, event:Event):void
    onEnded?(slot:AudioSlot, event:Event):void
    onError?(slot:AudioSlot, event:Event):void
}

/* -------------------------------------------------------------------------- */
/* Source Resolver                                                             */
/* -------------------------------------------------------------------------- */

export interface IAudioSourceProvider {
  resolve(track: PlayerTrack, signal?: AbortSignal): Promise<string>
  clear(): void
}

/* -------------------------------------------------------------------------- */
/* Audio Engine                                                                */
/* -------------------------------------------------------------------------- */

export interface IAudioEngine {
  readonly context: Readonly<EngineContext>
  readonly eventBus: EngineEventBus
  initialize(audioA: HTMLAudioElement, audioB: HTMLAudioElement): void
  destroy(): void
  load(track: PlayerTrack): Promise<LoadResult>
  preload(track: PlayerTrack): Promise<LoadResult>
  play(): Promise<PlayResult>
  pause(): Promise<void>
  stop(): Promise<void>
  transition(track: PlayerTrack): Promise<TransitionResult>
  swap(): Promise<AudioSlot>
  activate(): Promise<void>
  deactivate(): Promise<void>
  updateOptions(options: Partial<EngineOptions>): void
}