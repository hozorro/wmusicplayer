<script setup lang="ts">
/**
 * 实体菜单宿主：底部动作面板 + 面板栈（A47）。
 * 全局挂载于 DefaultLayout；触发点经 openEntityMenu(source) 唤起。
 * 子流程（歌单选择）以横移面板承接，不嵌套 popover。
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { invalidateCache } from 'alova'
import { usePlayer } from '@/composables/playback'
import { usePlayerQueue } from '@/composables/player-queue'
import { playbackWriter } from '@/services/playback-data'
import { entityMenuSource, closeEntityMenu } from '@/player/menu/state'
import { MENU_ACTIONS, KIND_LABEL } from '@/player/menu/definitions'
import { MENU_ICONS } from '@/player/menu/icons'
import type { MenuContext } from '@/player/menu/context'
import type { PlayTrack } from '@/player/types'
import { getPlaylists, addTrackToPlaylist, getPlaylist } from '@/apis/methods/music'
import { addTrackToPlaylist as idbAddTrackToPlaylist } from '@/apis/methods/idb-locals'

const router = useRouter()

const player = usePlayer()
const playQueue = usePlayerQueue()

const source = entityMenuSource
const open = computed(() => source.value !== null)
const panel = ref<'root' | 'playlist-picker'>('root')
const busyKey = ref<string | null>(null)   // resolves 动作单飞锁（A46）

watch(open, o => { if (o) { 
  panel.value = 'root'; 
  busyKey.value = null, pickerList.value = [];
  addedId.value = null;
} })

const pickerList = ref<{ id: number, title: string, cover?: string}[]>([])
const pickerLoading = ref(false)
const addingId = ref<number | null>(null)
const addedId = ref<number | null>(null)

async function enterPicker() {
  panel.value = 'playlist-picker'
  addedId.value = null
  pickerLoading.value = true
  try {
    pickerList.value = (await getPlaylists().send())
      .map(p => ({ id: p.id, title: p.title, cover: p.cover }))
  } catch {
    pickerList.value = []
  } finally {
    pickerLoading.value = false
  }
}

async function addToPlaylist(pId: number) {
  const s = source.value
  if (!s || !('track' in s) || addingId.value !== null) return
  addingId.value = pId
  playbackWriter.write({
    key: `playlist:${pId}:track:${s.track.id}`,
    label: `添加曲目 ${s.track.title}`,
    opType: 'add-track-to-playlist',
    payload: { playlist_id: pId, track_id: s.track.id },
    local: async () => { await idbAddTrackToPlaylist(pId, s.track.id) },
    remote: async () => { await addTrackToPlaylist(pId, s.track.id).send() },
  })
  invalidateCache(getPlaylist(pId))
  addingId.value = null 
}

function goToPlaylists() {
  closeEntityMenu()
  router.push({ name: 'playlist-all' })
}

const actions = computed(() =>
  source.value ? MENU_ACTIONS[source.value.kind] : [])

const headerTitle = computed(() => {
  const s = source.value
  if (!s) return ''
  return s.kind === 'track' || s.kind === 'queue-track' || s.kind === 'playlist-track' ? s.track.title : s.title
})
const headerSubinfo = computed(() => {
  const s = source.value
  if (!s) return ''
  return s.kind === 'track' || s.kind === 'queue-track' || s.kind === 'playlist-track'
    ? s.track.artists?.join(' / ') ?? ''
    : s.subinfo ?? ''
})
const headerArtwork = computed(() => {
  const s = source.value
  if (!s) return undefined
  return s.kind === 'track' || s.kind === 'queue-track' || s.kind === 'playlist-track' ? s.track.cover : s.cover
})

const ctx: MenuContext = {
  player,
  playQueue,
  resolveTracks: async s =>
    'resolveTracks' in s && s.resolveTracks ? s.resolveTracks() : [] as PlayTrack[],
  openPanel: p => { if (p === 'playlist-picker') enterPicker() },
}

async function runAction(key: string) {
  const s = source.value
  const action = actions.value.find(a => a.key === key)
  if (!s || !action || action.placeholder || busyKey.value) return

  if (action.resolves) {
    busyKey.value = key
    try { await action.run(s, ctx) } finally { busyKey.value = null }
  } else {
    await action.run(s, ctx)
  }
  if (!action.keepsOpen) closeEntityMenu()
}
</script>

<template>
  <Teleport to="body">
    <!-- 遮罩：z-[80]，压过队列面板（60/70）——菜单可从 QueueSheet 内唤起 -->
    <Transition
      enter-active-class="transition-opacity duration-250"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-[80] bg-black/60" @click="closeEntityMenu()" />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-y-full"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-to-class="translate-y-full"
    >
      <section
        v-if="open"
        class="fixed inset-x-0 bottom-0 z-[90] rounded-t-xl bg-zinc-900 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/60 ring-1 ring-white/10"
      >
        <div class="overflow-hidden">
          <!-- 面板栈：root 与歌单选择面板横移切换 -->
          <div
            class="flex transition-transform duration-300 ease-out"
            :style="{ transform: panel === 'root' ? 'none' : 'translateX(-100%)' }"
          >
            <!-- ── root 面板：来源头部 + 动作表 ── -->
            <div class="w-full shrink-0">
              <div class="flex justify-center pt-3"><div class="h-1 w-10 rounded-full bg-zinc-600" /></div>

              <header v-if="source" class="flex items-center gap-3 px-5 pb-3 pt-2">
                <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/5">
                  <img v-if="headerArtwork" :src="headerArtwork" alt="" class="h-full w-full object-cover" />
                  <svg v-else viewBox="0 0 24 24" class="m-auto mt-3 h-5 w-5 text-zinc-600" fill="currentColor">
                    <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {{ KIND_LABEL[source.kind] }}
                  </p>
                  <h3 class="max-w-[72vw] truncate text-base font-bold text-zinc-50">{{ headerTitle }}</h3>
                  <p v-if="headerSubinfo" class="max-w-[72vw] truncate text-xs text-zinc-400">{{ headerSubinfo }}</p>
                </div>
              </header>

              <nav class="px-2 pb-3">
                <button
                  v-for="a in actions"
                  :key="a.key"
                  class="flex w-full items-center gap-3.5 rounded-lg px-3.5 py-3 text-left transition"
                  :class="[
                    a.placeholder
                      ? 'cursor-not-allowed opacity-45'
                      : 'active:scale-[0.99] active:bg-white/10 hover:bg-white/5',
                    busyKey && busyKey !== a.key ? 'pointer-events-none opacity-30' : '',
                  ]"
                  :disabled="a.placeholder"
                  @click="runAction(a.key)"
                >
                  <span v-if="busyKey === a.key" class="flex w-5 justify-center">
                    <span class="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400" />
                  </span>
                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    class="h-5 w-5 shrink-0"
                    :class="a.danger ? 'text-rose-400' : 'text-zinc-400'"
                    fill="currentColor"
                  >
                    <path v-for="(d, i) in MENU_ICONS[a.icon]" :key="i" :d="d" />
                  </svg>
                  <span class="flex-1 text-sm" :class="a.danger ? 'font-medium text-rose-400' : 'text-zinc-100'">
                    {{ a.label }}
                  </span>
                  <span v-if="a.placeholder" class="rounded bg-white/10 px-1.5 py-px text-[10px] text-zinc-500">待接入</span>
                </button>
              </nav>
            </div>

            <!-- 歌单选择面板 -->
            <div class="w-full shrink-0">
              <div class="flex justify-center pt-3"><div class="h-1 w-10 rounded-full bg-zinc-600" /></div>
              <header class="flex items-center gap-2 px-3 pb-3 pt-2">
                <button
                  class="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 active:scale-90"
                  aria-label="返回"
                  @click="panel = 'root'"
                >
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor"><path d="M14.7 5.3 8 12l6.7 6.7 1.4-1.4L10.8 12l5.3-5.3z" /></svg>
                </button>
                <h3 class="text-base font-bold text-zinc-50">添加到歌单</h3>
              </header>
              
              <!-- 加载中 -->
              <div v-if="pickerLoading" class="space-y-2 px-2 pb-4 pt-1">
                <div v-for="n in 3" :key="n" class="flex animate-pulse items-center gap-3 rounded-xl px-3 py-2.5">
                  <div class="h-10 w-10 rounded-lg bg-zinc-800" />
                  <div class="h-4 w-1/2 rounded bg-zinc-800" />
                </div>
              </div>

              <!-- 歌单列表 -->
              <div
                v-else-if="pickerList.length"
                class="max-h-[40vh] space-y-1 overflow-y-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <button
                  v-for="p in pickerList"
                  :key="p.id"
                  class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5 active:scale-[0.99] disabled:pointer-events-none"
                  :disabled="addingId !== null || addedId !== null"
                  @click="addToPlaylist(p.id)"
                >
                  <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/5">
                    <img v-if="p.cover" :src="p.cover" alt="" class="h-full w-full object-cover" />
                    <svg v-else viewBox="0 0 24 24" class="m-auto mt-2.5 h-5 w-5 text-zinc-600" fill="currentColor">
                      <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                      <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
                    </svg>
                  </div>
                  <span class="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">{{ p.title }}</span>
                  <span
                    v-if="addingId === p.id"
                    class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400"
                  />
                  <svg
                    v-else-if="addedId === p.id"
                    viewBox="0 0 24 24"
                    class="h-5 w-5 shrink-0 text-emerald-400"
                    fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>

              <!-- 无歌单 -->
              <div v-else class="flex flex-col items-center gap-3 px-5 pb-8 pt-6 text-center">
                <p class="text-sm text-zinc-500">还没有歌单</p>
                <button
                  class="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-zinc-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 active:scale-95"
                  @click="goToPlaylists"
                >
                  去创建
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>