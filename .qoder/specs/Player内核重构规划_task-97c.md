# Player 内核重构分步规划

## 总体策略

- **自底向上构建**：先 audio-engine，再 controllers，最后 player facade
- **新目录 `src/player/`**：与旧代码并存，开发期间不影响现有功能
- **最终一步切换**：PlayerBox 在 facade 完成后一次性切换引用，删除旧代码

## 目录结构总览

```
src/player/
├── index.ts                  // Facade - usePlayer()
├── state.ts                  // Player State (reactive)
├── events.ts                 // PlayerEventBus
├── types.ts                  // 公共类型
├── controllers/
│   ├── preload.ts
│   ├── transition.ts
│   ├── playlist.ts
│   ├── lyric.ts
│   └── mediasession.ts
├── playlist/
│   ├── model.ts              // 纯数据模型（seqList/seqIndex/seqOrder）
│   └── types.ts
└── audio-engine/
    ├── engine.ts             // Engine 主类
    ├── binder.ts             // Audio 元素绑定
    ├── handler.ts            // 原始事件响应 -> emit EngineEvent
    ├── queue.ts              // 串行 Promise Queue (支持 abort)
    ├── audio-source.ts       // 音频文件获取 (fetch + cache)
    ├── events.ts             // EngineEventBus
    ├── interfaces.ts         // Engine 接口定义
    └── types.ts              // Engine 内部类型
```

---

## Phase 1: 基础设施层 — audio-engine

### Step 1.1: 类型与接口定义
**文件**: `audio-engine/types.ts`, `audio-engine/interfaces.ts`

- 定义 `AudioSlot` 接口：`{ id: 'A'|'B', audio: HTMLAudioElement, state: SlotState, trackId: number | null }`
- 定义 `SlotState`: `'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'`
- 定义 `EngineEvent` 联合类型（playing/paused/ended/timeupdate/loaded/error/durationchange 等）
- 定义 `EngineActions` 接口：`load(slotId, src)`, `play(slotId)`, `pause(slotId)`, `seek(slotId, time)`, `swap()` 等
- 定义 `AudioSlotId = 'A' | 'B'`

### Step 1.2: EngineEventBus
**文件**: `audio-engine/events.ts`

- 实现轻量 EventBus（基于 `EventTarget` 或手写 emitter）
- 提供 `emit(event: EngineEvent)` 和 `on(type, handler)` / `off(type, handler)` 方法
- 事件只描述 audio 运行时状态，不含业务语义

### Step 1.3: Handler — 原始事件响应
**文件**: `audio-engine/handler.ts`

- `createAudioHandler(audio: HTMLAudioElement, slotId: AudioSlotId, bus: EngineEventBus)`
- 为 audio 元素绑定原生事件（play/pause/ended/timeupdate/loadedmetadata/error/durationchange/canplay）
- 每个事件转为对应的 `EngineEvent` 并 emit 到 bus
- 返回 `dispose()` 用于清理监听器

### Step 1.4: Binder — Audio 元素绑定
**文件**: `audio-engine/binder.ts`

- `createBinder(bus: EngineEventBus)`
- 管理两个 AudioSlot 的创建与绑定
- `bind(audioA: HTMLAudioElement, audioB: HTMLAudioElement)` -> 创建两个 slot，各自 attach handler
- `unbind()` -> dispose 所有 handler
- 提供 `getSlot(id)` / `getActiveSlot()` / `getStandbySlot()` 访问方法

### Step 1.5: Queue — 串行 Promise 队列
**文件**: `audio-engine/queue.ts`

- `createActionQueue()` 
- `enqueue(action: (signal: AbortSignal) => Promise<void>, options?: { interruptible?: boolean })`
- 当新任务入队时，若当前任务可打断（interruptible），则 abort 当前任务
- 使用 `AbortController` 管理取消
- 返回 Promise 以便 await 完成

### Step 1.6: AudioSource — 音频文件获取
**文件**: `audio-engine/audio-source.ts`

- 从现有 `audio-cache.ts` 演进，保持 LRU 缓存逻辑不变
- `resolveSource(trackId: number): Promise<string>` — 优先缓存，否则 fetch
- 内部调用 `getStreamingUrl` + fetch -> blob URL
- 保留 `preload(trackId)`, `invalidate(trackId)`, `has(trackId)`, `clearAll()` 等接口
- 此模块独立于 engine，engine 和 controllers 都可以引用

### Step 1.7: Engine 主类
**文件**: `audio-engine/engine.ts`

- `createEngine(audioA: HTMLAudioElement, audioB: HTMLAudioElement)` 
- 组合 binder + handler + queue + eventBus
- 暴露 EngineActions 接口：
  - `loadOnSlot(slotId, src)` — queue 中执行 audio.src = src + load()
  - `playSlot(slotId)` — queue 中执行 audio.play()
  - `pauseSlot(slotId)` — audio.pause()
  - `seekSlot(slotId, time)` — audio.currentTime = time
  - `prepareStandby(trackId)` — 在 standby slot 上预加载
  - `swapSlots()` — 交换 active/standby 角色
  - `getActiveSlot()` / `getSlotState(slotId)`
- 暴露 `events: EngineEventBus` 供 controller 监听
- `dispose()` — 清理所有资源

### Step 1.8: Engine 单元测试
- 测试 queue 的串行执行和 abort 打断
- 测试 eventBus 的 emit/on/off
- 测试 handler 正确转发事件（mock HTMLAudioElement）
- 测试 audio-source 的缓存命中/失效/LRU 淘汰

---

## Phase 2: 播放列表模型 — playlist/

### Step 2.1: Playlist 纯数据模型
**文件**: `playlist/types.ts`, `playlist/model.ts`

- 将现有 `play-seq.ts` 的逻辑迁移为**纯函数/纯对象**，不依赖 Vue reactivity
- `PlaylistModel` 包含：
  - `tracks: Track[]`
  - `currentIndex: number`
  - `seqList: number[]` — 播放序列索引
  - `seqIndex: number` — 当前在序列中的位置
  - `mode: SeqMode`
- 方法（纯操作，返回新状态或原地修改）：
  - `next()` / `prev()` — 根据 mode 计算下一首索引
  - `setMode(mode)` — 切换播放模式
  - `addTracks(tracks, mode: PlayChangeMode)` — 处理各种添加模式
  - `removeTrack(index)` — 删除并调整序列
  - `getCurTrackId()` / `getNextTrackId()` / `getPrevTrackId()`
- 此模型可独立单元测试

### Step 2.2: Playlist 模型单元测试
- 测试顺序/随机/单曲循环模式下的 next/prev
- 测试各种 PlayChangeMode 下的 addTracks
- 测试 removeTrack 后序列正确性
- 测试模式切换时保持当前位置

---

## Phase 3: 事件总线与 Player State

### Step 3.1: PlayerEventBus
**文件**: `events.ts`

- 与 EngineEventBus 同构，但事件类型不同
- `PlayerEvent` 联合类型：
  - `track-changed` — 曲目切换
  - `track-info-updated` — 曲目信息更新
  - `play-mode-changed` — 播放模式变更
  - `playlist-changed` — 播放列表变更
  - `lyric-updated` — 歌词更新
  - `error` — 业务层错误
  - `fav-toggled` — 收藏状态变更

### Step 3.2: Player State
**文件**: `state.ts`

- `createPlayerState()` — 返回 reactive 状态对象
- 状态分类：
  - **Derived from Engine**: `isPlaying`, `currentTime`, `duration`, `activeSlotId`
  - **Business**: `currentTrack: TrackInfo`, `playlist: Track[]`, `seqMode: SeqMode`
  - **Transient**: `isLoading`, `isSeeking`
  - **Lyric**: `curLyricIndex`, `curLyric`, `lyricLoading`, `lyricError`, `lyrics`, `metadata`
- 提供 setter 方法，不直接暴露 raw reactive
- 此 state 是 Player Facade 对外暴露的核心数据

### Step 3.3: 公共类型
**文件**: `types.ts`

- `PlayerFacade` 接口定义（state + actions）
- Controller 基类接口：`Controller { init(): void, dispose(): void }`
- 其他跨模块共享类型

---

## Phase 4: Controllers

### Step 4.1: Playlist Controller
**文件**: `controllers/playlist.ts`

- 持有 `PlaylistModel` 实例
- 监听 `PlayerEvent.playlist-changed`，调用 model 方法更新序列
- 监听 `EngineEvent.ended`，决定 next/prev/loop
- 负责调用 `getTrackInfo()` 获取曲目信息，更新 `state.currentTrack`
- 管理 store 中的 `curPlaylist` / `curPlayIndex` 同步
- 暴露方法：`playTrack(index)`, `next()`, `prev()`, `removeTrack(id)`, `setMode(mode)`, `handlePlaylistChange(mode)`

### Step 4.2: Transition Controller
**文件**: `controllers/transition.ts`

- 管理双 Slot 切换的核心流程：
  1. 收到切歌指令 -> 在 standby slot 上 load src -> play -> swap active/standby -> pause 旧 slot
  2. 处理 iOS 下 `ended` 事件的自动切歌（standby 已预加载，直接 play）
- 监听 `EngineEvent.error`，实现错误恢复（consecutiveError 计数 + 自动跳下一首）
- 协调 `audio-source` 获取播放 URL（缓存优先）
- 暴露方法：`switchTo(trackId)`, `autoNext()`

### Step 4.3: Preload Controller
**文件**: `controllers/preload.ts`

- 监听 `PlayerEvent.track-changed` — 切歌后调度预加载
- 监听 `EngineEvent.timeupdate` — 80% 进度时补充预加载
- 管理预加载时机（延迟 3 秒，避免带宽竞争）
- 检测网络状况（`navigator.connection`）决定是否预加载
- playlist 变更时 invalidate 旧的预加载
- 调用 `audio-source.preload(trackId)` 和 `audio-source.invalidate(trackId)`

### Step 4.4: Lyric Controller
**文件**: `controllers/lyric.ts`

- 监听 `PlayerEvent.track-changed` — 加载新歌词
- 监听 `EngineEvent.timeupdate` — 更新当前歌词行
- 管理 `LyricParser` 实例
- 管理歌词滚动（scrollToCurrent）— 需要 lyricContainerRef
- 更新 `state.curLyricIndex`, `state.lyrics`, `state.lyricLoading` 等

### Step 4.5: MediaSession Controller
**文件**: `controllers/mediasession.ts`

- 重构现有 `media-session.ts`
- 监听 `EngineEvent.playing/paused/timeupdate` — 更新 playbackState 和 positionState
- 监听 `PlayerEvent.track-changed` — 更新 metadata
- 注册 action handlers（play/pause/next/prev）— 调用 player actions
- 不再直接绑定 audio 元素事件，改为监听 EngineEventBus

### Step 4.6: Controller 单元测试
- 测试 playlist controller 的 next/prev/loop 逻辑（mock EngineEventBus）
- 测试 transition controller 的 slot 切换序列
- 测试 preload controller 的调度与取消

---

## Phase 5: Player Facade

### Step 5.1: Composition Root — usePlayer()
**文件**: `index.ts`

- `usePlayer(options?: { lyricContainerRef?: Ref<HTMLElement | null> })` 
- 职责（仅组装，无业务逻辑）：
  1. 创建两个 `HTMLAudioElement`（`new Audio()` 或从 DOM 获取）
  2. 创建 `Engine`
  3. 创建 `PlayerState`
  4. 创建各 `Controller`，注入 engine + state + eventBus
  5. 按顺序 init 所有 controller
  6. 返回 `PlayerFacade`（state + actions）
- 生命周期管理：`onBeforeUnmount` 时 dispose 所有 controller 和 engine
- Actions 委托给对应 controller：
  - `play/pause/toggle` -> engine + playlist controller
  - `next/prev` -> playlist controller -> transition controller
  - `seek` -> engine
  - `setMode` -> playlist controller
  - `playTrack` -> playlist controller -> transition controller
  - `handleFav/handleArtistFav` -> 保留在 facade 层（属于 UI 交互，非播放核心）

### Step 5.2: 适配 PlayerBox.vue
**文件**: `src/components/PlayerBox.vue`

关键改动：
- 移除模板中的 `<audio ref="audioRef">` 单元素，改为让 engine 内部创建管理
- 移除 `audioRef` template ref（engine 内部管理 audio 元素）
- `usePlayer()` 调用方式变更，不再传入 audioRef
- `onTimeUpdate` 逻辑改为监听 state.currentTime（不再依赖 audio 的 timeupdate 事件直接回调）
- 进度条计算改为使用 state 中的 derived 值
- 其余 UI 绑定基本不变（track.title, playStatus, lyrics 等通过 state 暴露）

### Step 5.3: 集成测试与调优
- 验证正常播放流程：play -> pause -> seek -> next -> prev
- 验证 iOS Safari 自动切歌
- 验证单曲循环（currentTime = 0 + play，无需网络请求）
- 验证各种 PlayChangeMode 添加模式
- 验证预加载时机和失效
- 验证歌词加载和滚动
- 验证 MediaSession 控制
- 验证错误恢复（连续失败自动跳下一首）

---

## Phase 6: 清理

### Step 6.1: 删除旧代码
- 删除 `src/composables/player.ts`
- 删除 `src/composables/play-seq.ts`
- 删除 `src/composables/audio-cache.ts`（已被 audio-source.ts 替代）
- 删除 `src/composables/media-session.ts`（已被 controllers/mediasession.ts 替代）

### Step 6.2: 更新引用
- 检查并更新所有 import 路径
- 更新现有测试文件（`audio-cache.test.ts`, `play-seq.test.ts`）

---

## 风险点与注意事项

1. **双 Audio 元素的 DOM 管理**：iOS 要求 audio 元素必须在 DOM 中才能 play，两个 audio 都需要挂载到 DOM
2. **Queue 的 Abort 语义**：abort 后需要正确处理已部分执行的 load 操作（重置 audio.src）
3. **Store 同步**：playlist controller 需要同步 store 中的 curPlaylist/curPlayIndex，确保其他页面（如 Playlist.vue）的操作能正确传递
4. **HMR 兼容**：audio-source 的 Blob URL 需要在 HMR dispose 时清理
5. **现有测试迁移**：`play-seq.test.ts` 的逻辑迁移到 `playlist/model` 测试；`audio-cache.test.ts` 迁移到 `audio-source` 测试
