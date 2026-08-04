<script setup lang="ts">
/**
 * 歌单详情页：曲库系列唯一编辑形态
 * 曲目移除 / 排序（乐观更新 + 失败回滚）
 */
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import TrackList from "@/components/TrackList.vue";
import { useCollapseHeader } from "@/composables/collapse-header";
import { usePlayer } from "@/composables/playback";
import { toPlayTrack } from "@/services/transform";
import type { MenuSource } from "@/player/menu/types";
import type { PlayTrack } from "@/player/types";
import { invalidateCache } from "alova";
import { useRequest, useForm } from "alova/client";
import { useI18n } from "vue-i18n";
import { shuffled, isNumberic } from "@/utilies/general";
import { playbackWriter } from "@/services/playback-data";
import { getPlaylist, updatePlaylist, removeTrackFromPlaylist, movePlaylistTrack, updatePlaylistHit } from "@/apis/methods/music";
import { updateHits, removeTrackFromPlaylist as idbRemoveTrackFromPlaylist, movePlaylistTrack as idbMovePlaylistTrack } from "@/apis/methods/idb-locals";
import WMessage from "@/composables/message";
import dayjs from "dayjs";

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const player = usePlayer()
const { heroStyle, compactStyle, reset: resetCollapse } = useCollapseHeader({ range: 220, parallax: 56 })

const editing = ref(false)

const {data: playlist, send: getData} = useRequest(() => {
  let pid: number | string = route.params.id as string
  if (isNumberic(route.params.id as string)) pid = parseInt(route.params.id as string)
  return getPlaylist(pid)
},{
  initialData: { id: '', name: '', tracks: [] },
  immediate: false
})

watch(() => route.params.id, async id => {
  if (!id) return
  editing.value = false
  resetCollapse()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  getData()
}, { immediate: true })

const tracks = computed(() => 
  playlist.value?.tracks.map(t => toPlayTrack(t)) ?? []
)

// 编辑操作：乐观更新 + 失败精确回滚，API接口预留
function removeTrack(id: number) {
  const arr = playlist.value!.tracks
  const idx = arr.findIndex(t => t.id === id)
  if (idx === -1) return
  const [removed] = arr.splice(idx, 1)
  const ok = playbackWriter.write({
    key: `playlist:${playlist.value.id}:track:${id}`,
    label: `移除曲目 ${removed.title}`,
    opType: 'remove-track-from-playlist',
    payload: { id: playlist.value.id, track_id: id },
    local: async () => { await idbRemoveTrackFromPlaylist(playlist.value!.id, id) },
    remote: async () => { await removeTrackFromPlaylist(playlist.value!.id, id) },
  })
  invalidateCache(getPlaylist(playlist.value!.id))
  if (!ok) arr.splice(idx, 0, removed)
}

function moveTrack(id: number, direction: -1 | 1) {
  const arr = playlist.value!.tracks
  const idx = arr.findIndex(t => t.id === id)
  const targetIdx = idx + direction
  if (idx === -1 || targetIdx < 0 || targetIdx >= arr.length) return
  ;[arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]]
  const ok = playbackWriter.write({
    key: `playlist:${playlist.value.id}:track:${id}`,
    label: `移动曲目 ${arr[idx].title}`,
    opType: 'move-playlist-track',
    payload: { id: playlist.value.id, track_id: id, target_id: arr[targetIdx].id },
    local: async () => { await idbMovePlaylistTrack(playlist.value!.id, id, arr[targetIdx].id) },
    remote: async () => { await movePlaylistTrack(playlist.value!.id, id, arr[targetIdx].id) },
  })
  invalidateCache(getPlaylist(playlist.value!.id))
  if (!ok) {
    [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]]
  }
}

// TrackList 菜单注入： playlist-track 类型携带移除回调
const playlistMenuSource = (t: PlayTrack): MenuSource => ({
  kind: "playlist-track",
  track: t,
  onRemove: () => removeTrack(t.id)
})

async function writePlaylistHits() {
  playbackWriter.write({
    key: `playlist:${playlist.value.id}:hits`,
    label: `播放计次 ${playlist.value.title}`,
    opType: 'hit-playlist',
    payload: { id: playlist.value.id, at: dayjs().format() },
    local: async () => { await updateHits('playlist', playlist.value!.id) },
    remote: async () => { await updatePlaylistHit(playlist.value!.id) },
  })
}

async function handlePlayAll(){
  player.playAll(tracks.value)
  await writePlaylistHits()
}
async function handlePlayRandom(){
  player.playAll(shuffled(tracks.value))
  await writePlaylistHits()
}

// edit playlist
const editOpened = ref(false)
const coverPreview = ref<string>()
const coverFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
function openEdit() {
  coverPreview.value = playlist.value?.cover ?? ''
  form.value.title = playlist.value.title
  form.value.comment = playlist.value.comment
  editOpened.value = true
}
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (coverPreview.value?.startsWith('blob:')) URL.revokeObjectURL(coverPreview.value)
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
  form.value.cover = file
}
const {
  loading,
  form,
  send: submit,
  uploading,
  onSuccess,
  onError,
} = useForm(
  (data) => {
    const formData = new FormData()
    formData.append('id', playlist.value.id!.toString()) //formData type: string | Blob
    formData.append('title', data.title)
    formData.append('comment', data.comment)
    if(data.cover){
      formData.append('cover', data.cover)
    }
    return updatePlaylist(formData)
  },
  {
    initialForm:{
      title: '',
      comment: '',
      cover: null as File | null
    },
    immediate: false
  },
)
const progress = computed(() => {
  if(uploading.value.total > 0){
    return uploading.value.loaded / uploading.value.total * 100
  }
  return 0
})
onSuccess(() => {
  uploading.value.loaded = 0
  editOpened.value = false
  getData()
})
onError(() => {
  WMessage(t('errors.fail_update'), 'error')
})
function handleSubmit() {
  if(!form.value.title){
    WMessage(t('errors.playlist_title_empty'), 'error')
    return
  }
  submit()
}
</script>

<template>
  <div class=" min-h-dvh">
    <!-- 固定顶栏 -->
    <div class=" fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/60 via-black/30 to-transparent pb-6 pt-[calc(env(safe-area-inset-top)+10px)]">
      <div class=" mx-auto flex max-w-2xl items-center gap-3 px-4">
        <button
          class="shrink-0 rounded-full bg-black/30 p-2 text-zinc-100 ring-1 ring-white/10 transition hover:bg-black/50 active:scale-90"
          aria-label="返回" @click="router.back()"
        >
          <span class=" icon-[solar--alt-arrow-left-linear] text-2xl"></span>
        </button>
        <h2 :style="compactStyle" class="min-w-0 flex-1 truncate text-base font-bold text-zinc-50">
          {{ playlist?.title ?? '...' }}
        </h2>
      </div>
    </div>

    <template v-if="playlist">
      <!-- ═══ hero：封面 + 信息 + 编辑 + 动作 ═══ -->
      <header :style="heroStyle" class=" will-change-transform">
        <div class="mx-auto max-w-2xl px-4 pb-5 pt-[calc(env(safe-area-inset-top)+64px)]">
          <div class="flex items-start gap-4">
            <div class="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-900 shadow-2xl shadow-black/60 ring-1 ring-white/10">
              <img v-if="playlist.cover" :src="playlist.cover" alt="" class="h-full w-full object-cover" />
              <svg v-else viewBox="0 0 24 24" class="m-auto mt-9 h-10 w-10 text-zinc-700" fill="currentColor">
                <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
              </svg>
            </div>
            <div class="min-w-0 flex-1 pt-0.5">
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">歌单</p>
              <h1 class="mt-1 text-2xl font-extrabold leading-tight text-zinc-50">{{ playlist.title }}</h1>
              <p class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                {{ playlist.comment || '暂无介绍' }}
              </p>
              <p class="mt-1.5 text-[11px] tabular-nums text-zinc-500">
                {{ dayjs(playlist.created_at).format('YYYY-MM-DD HH:mm') }} 创建 · {{ playlist.tracks.length }} 首
              </p>
            </div>
            <button
              class="shrink-0 rounded-full p-2 text-zinc-400 transition hover:bg-white/8 hover:text-zinc-100 active:scale-90"
              aria-label="编辑歌单" @click="openEdit"
            >
              <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
          </div>

          <div class="mt-5 flex gap-2.5">
            <button
              class="rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              :disabled="!tracks.length"
              @click="handlePlayAll"
            >
              {{ t('player.playall') }}
            </button>
            <button
              class="rounded-full px-5 py-2 text-sm font-semibold text-zinc-200 ring-1 ring-white/15 transition hover:bg-white/10 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              :disabled="!tracks.length"
              @click="handlePlayRandom"
            >
              {{ t('player.randomplay') }}
            </button>
          </div>
        </div>
      </header>

      <!-- ═══ 曲目区：普通 / 编辑 双形态 ═══ -->
      <main class="mx-auto max-w-2xl px-4 pb-32">
        <div class="flex items-center justify-between pb-2 pt-5">
          <h2 class="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            曲目 <span class="tabular-nums">· {{ tracks.length }}</span>
          </h2>
          <button
            v-if="tracks.length"
            class="rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95"
            :class="editing ? 'bg-amber-400 text-zinc-950' : 'text-amber-400 hover:bg-white/5'"
            @click="editing = !editing"
          >
            {{ editing ? '完成' : '管理' }}
          </button>
        </div>

        <!-- 普通模式：TrackList + playlist-track 菜单 -->
        <TrackList v-if="!editing" :tracks="tracks" :menu-source="playlistMenuSource" :show-art="true" />

        <!-- 编辑模式：上移 / 下移 / 删除 -->
        <div v-else class="space-y-1">
          <div
            v-for="(t, i) in tracks"
            :key="t.id"
            class="flex items-center gap-1.5 rounded-xl bg-white/[0.03] px-2 py-2 ring-1 ring-white/5"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0 text-zinc-600" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
            </svg>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-zinc-100">{{ t.title }}</p>
              <p class="truncate text-xs text-zinc-500">{{ t.artists ? t.artists.map(a => a.name).join(', ') : '未知艺术家' }}</p>
            </div>
            <button
              class="rounded-md p-1.5 text-zinc-400 transition hover:bg-white/10 active:scale-90 disabled:pointer-events-none disabled:opacity-25"
              :disabled="i === 0" aria-label="上移" @click="moveTrack(t.id, -1)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
            <button
              class="rounded-md p-1.5 text-zinc-400 transition hover:bg-white/10 active:scale-90 disabled:pointer-events-none disabled:opacity-25"
              :disabled="i === tracks.length - 1" aria-label="下移" @click="moveTrack(t.id, 1)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            </button>
            <button
              class="rounded-md p-1.5 text-rose-400 transition hover:bg-rose-400/10 active:scale-90"
              aria-label="移除" @click="removeTrack(t.id)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <p class="pt-3 text-center text-[11px] text-zinc-600">调整即时生效</p>
        </div>

        <p v-if="!tracks.length" class="py-16 text-center text-sm text-zinc-500">
          歌单为空——在任意曲目菜单选择"添加到歌单"即可收集
        </p>
      </main>
    </template>

    <!-- 骨架 -->
    <div v-else class="animate-pulse">
      <div class="mx-auto max-w-2xl px-4 pt-[calc(env(safe-area-inset-top)+64px)]">
        <div class="flex items-start gap-4">
          <div class="h-28 w-28 rounded-xl bg-zinc-800/80" />
          <div class="flex-1 space-y-2.5 pt-1">
            <div class="h-3 w-10 rounded bg-zinc-800/80" />
            <div class="h-7 w-2/3 rounded bg-zinc-800/80" />
            <div class="h-3 w-full rounded bg-zinc-800/80" />
            <div class="h-3 w-1/2 rounded bg-zinc-800/80" />
          </div>
        </div>
        <div class="mt-5 flex gap-2.5">
          <div class="h-9 w-24 rounded-full bg-zinc-800/80" />
          <div class="h-9 w-28 rounded-full bg-zinc-800/80" />
        </div>
        <div class="mt-10 space-y-3">
          <div v-for="n in 6" :key="n" class="h-12 rounded-xl bg-zinc-800/50" />
        </div>
      </div>
    </div>
  </div>
  
  <!-- edit playlist -->
  <transition
    enter-active-class="transition-opacity duration-250" enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-200" leave-to-class="opacity-0"
  >
    <section 
      v-if="editOpened" 
      class=" absolute inset-x-0 bottom-0 h-[calc(100%-(--spacing(12)))] pb-[env(safe-area-inset-bottom)] rounded-t-2xl bg-zinc-900 shadow-2xl shadow-black/60 ring-1 ring-white/10""
    >
      <div class=" flex justify-baseline pt-3"><div class=" h-1 w-10 rounded-full bg-zinc-600" /></div>
      <div class=" flex justify-between px-4 pt-2 pb-4">
        <div class="  flex-none text-lg text-zinc-300" @click="editOpened = false">{{ t('common.cancel') }}</div>
        <div class=" flex-1 text-lg text-center font-semibold">{{ t('playlist.edit') }}</div>
        <div class="  flex-none text-lg text-amber-500" @click="handleSubmit">
          <span v-if="loading" class="icon-[svg-spinners--3-dots-scale]"></span>
          <span v-else>{{ t('common.submit') }}</span>
        </div>
      </div>

      <div class=" flex gap-4 px-4">
        <button
          class=" group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 transition active:scale-95"
          :class="coverPreview ? '' : 'border-2 border-dashed border-zinc-600 bg-zinc-800/50'"
          @click="fileInput?.click()"
        >
          <img v-if="coverPreview" :src="coverPreview" alt="" class="h-full w-full object-cover" />
          <div v-else class="flex h-full flex-col items-center justify-center gap-1 text-zinc-500">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
            <span class="text-[10px] font-medium">添加封面</span>
          </div>
          <div v-if="coverPreview" class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100 group-active:opacity-100">
            <span class="text-[11px] font-medium text-zinc-100">更换</span>
          </div>
          <div v-if="progress !== 0" class=" mx-2 w-[calc(100%-(--spacing(4)))] h-[2px]">
              <div class=" h-[2px] bg-cyan-500" :style="{width: progress + '%'}"></div>
            </div>
        </button>
        <input type="file" class=" hidden" ref="fileInput" accept="image/*" @change="onFileChange" />

        <div class=" max-w-0 flex-1 space-y-2.5">
          <input 
            v-model.trim="form.title" maxlength="50" class=" 
            w-full rounded-lg bg-white/5 px-3.5 py-2 text-sm text-zinc-100 outline-none ring-1 ring-white/10 transition placeholder:text-zinc-500 focus:ring-2 focus:ring-amber-400/60" 
            :placeholder="`${t('playlist.title_placeholder')} *`"
          />
          <textarea 
            v-model="form.comment" rows="2" maxlength="200" :placeholder="t('playlist.comment_placeholder')"
            class=" w-full resize-none rounded-lg bg-white/5 px-3.5 py-2 text-sm text-zinc-100 outline-none ring-1 ring-white/10 transition placeholder:text-zinc-500 focus:ring-2 focus:ring-amber-400/60"
          />
        </div>
      </div>
    </section>
  </transition>
</template>