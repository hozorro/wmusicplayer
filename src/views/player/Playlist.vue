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
import { useRequest } from "alova/client";
import { useI18n } from "vue-i18n";
import { shuffled } from "@/utilies/general";
import { getPlaylist } from "@/apis/methods/music";
import { updatePlaylist, removePlaylistTrack, movePlaylistTrack, bumpPlaylistHit } from "@/idb/app-api";
import { toast } from "@/services/toast";
import dayjs from "dayjs";

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const player = usePlayer()
const { heroStyle, compactStyle, reset: resetCollapse } = useCollapseHeader({ range: 220, parallax: 56 })

const editing = ref(false)

const {data: playlist, send: getData} = useRequest(() => {
  let pid = Number(route.params.id)
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

function removeTrack(id: number) {
  removePlaylistTrack(playlist.value!.id, id)
  invalidateCache(getPlaylist(playlist.value!.id))
}

function moveTrack(id: number, direction: -1 | 1) {
  const arr = playlist.value!.tracks
  const idx = arr.findIndex(t => t.id === id)
  const targetIdx = idx + direction
  movePlaylistTrack(playlist.value!.id, id, targetIdx)
  invalidateCache(getPlaylist(playlist.value!.id))
}

// TrackList 菜单注入： playlist-track 类型携带移除回调
const playlistMenuSource = (t: PlayTrack): MenuSource => ({
  kind: "playlist-track",
  track: t,
  onRemove: () => removeTrack(t.id)
})

function handlePlayAll(){
  player.playAll(tracks.value)
  bumpPlaylistHit(playlist.value!.id)
}
function handlePlayRandom(){
  player.playAll(shuffled(tracks.value))
  bumpPlaylistHit(playlist.value!.id)
}

// edit playlist
const editOpened = ref(false)
const editTitle = ref('')
const editComment = ref('')
const coverPreview = ref<string>()
const coverFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const updating = ref(false)

function openEdit() {
  coverPreview.value = playlist.value?.cover ?? ''
  editTitle.value = playlist.value.title
  editComment.value = playlist.value.comment
  editOpened.value = true
}
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (coverPreview.value?.startsWith('blob:')) URL.revokeObjectURL(coverPreview.value)
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
  coverFile.value = file
}

async function handleSubmit() {
  if(!editTitle.value.trim()){
    toast(t('errors.playlist_title_empty'), 'error')
    return
  }
  updating.value = true
  const res = await updatePlaylist(playlist.value!.id, { title: editTitle.value.trim(), comment: editComment.value.trim() }, coverFile.value || undefined)
  if (res.ok) {
    updating.value = false
    editOpened.value = false
    getData()
  } else {
    toast(res.reason, 'error')
    updating.value = false
  }
}
</script>

<template>
  <div class=" min-h-dvh">
    <!-- 固定顶栏 -->
    <div class=" fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent pb-6 pt-[calc(env(safe-area-inset-top)+10px)]">
      <div class=" mx-auto flex max-w-2xl items-center gap-3 px-4">
        <button
          class="shrink-0 rounded-full bg-primary/30 p-2 text-fg-primary ring-1 ring-fg-primary/10 transition hover:bg-primary/50 active:scale-90"
          :aria-label="t('common.back')" @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h2 :style="compactStyle" class="min-w-0 flex-1 truncate text-base font-bold text-fg-primary">
          {{ playlist?.title ?? '...' }}
        </h2>
      </div>
    </div>

    <template v-if="playlist">
      <!-- ═══ hero：封面 + 信息 + 编辑 + 动作 ═══ -->
      <header :style="heroStyle" class=" will-change-transform">
        <div class="mx-auto max-w-2xl px-4 pb-5 pt-[calc(env(safe-area-inset-top)+64px)]">
          <div class="flex items-start gap-4">
            <div class="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-primary shadow-2xl shadow-primary/60 ring-1 ring-fg-primary/10">
              <img v-if="playlist.cover" :src="playlist.cover" alt="" class="h-full w-full object-cover" />
              <svg v-else viewBox="0 0 24 24" class="m-auto mt-9 h-10 w-10 text-secondary" fill="currentColor">
                <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
              </svg>
            </div>
            <div class="min-w-0 flex-1 pt-0.5">
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-muted">{{ t('player.playlist') }}</p>
              <h1 class="mt-1 text-2xl font-extrabold leading-tight text-fg-primary">{{ playlist.title }}</h1>
              <p class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fg-muted">
                {{ playlist.comment || t('playlist.default_comment') }}
              </p>
              <p class="mt-1.5 text-[11px] tabular-nums text-fg-muted">
                {{ dayjs(playlist.created_at).format('YYYY-MM-DD HH:mm') }} {{ t('common.create') }} · {{ playlist.tracks.length }} {{ t('player.unit_track') }}
              </p>
            </div>
            <button
              class="shrink-0 rounded-full p-2 text-fg-muted transition hover:bg-fg-primary/8 hover:text-fg-primary active:scale-90"
              :aria-label="t('playlist.edit')" @click="openEdit"
            >
              <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
          </div>

          <div class="mt-5 flex gap-2.5">
            <button
              class=" btn-primary"
              :disabled="!tracks.length"
              @click="handlePlayAll"
            >
              {{ t('player.playall') }}
            </button>
            <button
              class=" btn-secondary"
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
          <h2 class="text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-muted">
            {{ t('player.track') }} <span class="tabular-nums">· {{ tracks.length }}</span>
          </h2>
          <button
            v-if="tracks.length"
            class="rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95"
            :class="editing ? 'bg-accent text-primary' : 'text-accent hover:bg-fg-primary/5'"
            @click="editing = !editing"
          >
            {{ editing ? t('common.complete') : t('common.manage') }}
          </button>
        </div>

        <!-- 普通模式：TrackList + playlist-track 菜单 -->
        <TrackList v-if="!editing" :tracks="tracks" :menu-source="playlistMenuSource" :show-art="true" />

        <!-- 编辑模式：上移 / 下移 / 删除 -->
        <div v-else class="space-y-1">
          <div
            v-for="(tk, i) in tracks"
            :key="tk.id"
            class="flex items-center gap-1.5 rounded-xl bg-white/[0.03] px-2 py-2 ring-1 ring-white/5"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0 text-fg-muted" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
            </svg>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-fg-primary">{{ tk.title }}</p>
              <p class="truncate text-xs text-fg-muted">{{ tk.artists ? tk.artists.map(a => a.name).join(', ') : t('player.unknown_artist') }}</p>
            </div>
            <button
              class="rounded-md p-1.5 text-fg-muted transition hover:bg-fg-primary/10 active:scale-90 disabled:pointer-events-none disabled:opacity-25"
              :disabled="i === 0" :aria-label="t('playlist.moveup')" @click="moveTrack(tk.id, -1)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
            <button
              class="rounded-md p-1.5 text-fg-muted transition hover:bg-fg-primary/10 active:scale-90 disabled:pointer-events-none disabled:opacity-25"
              :disabled="i === tracks.length - 1" :aria-label="t('playlist.movedown')" @click="moveTrack(tk.id, 1)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            </button>
            <button
              class="rounded-md p-1.5 text-rose-400 transition hover:bg-rose-400/10 active:scale-90"
              :aria-label="t('common.remove')" @click="removeTrack(tk.id)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <p class="pt-3 text-center text-[11px] text-fg-muted">{{ t('playlist.manage_tip') }}</p>
        </div>

        <p v-if="!tracks.length" class="py-16 text-center text-sm text-fg-muted">
          {{ t('playlist.empty_tip') }}
        </p>
      </main>
    </template>

    <!-- 骨架 -->
    <div v-else class="animate-pulse">
      <div class="mx-auto max-w-2xl px-4 pt-[calc(env(safe-area-inset-top)+64px)]">
        <div class="flex items-start gap-4">
          <div class="h-28 w-28 rounded-xl bg-secondary/80" />
          <div class="flex-1 space-y-2.5 pt-1">
            <div class="h-3 w-10 rounded bg-secondary/80" />
            <div class="h-7 w-2/3 rounded bg-secondary/80" />
            <div class="h-3 w-full rounded bg-secondary/80" />
            <div class="h-3 w-1/2 rounded bg-secondary/80" />
          </div>
        </div>
        <div class="mt-5 flex gap-2.5">
          <div class="h-9 w-24 rounded-full bg-secondary/80" />
          <div class="h-9 w-28 rounded-full bg-secondary/80" />
        </div>
        <div class="mt-10 space-y-3">
          <div v-for="n in 6" :key="n" class="h-12 rounded-xl bg-secondary/50" />
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
      class=" absolute inset-x-0 bottom-0 h-[calc(100%-(--spacing(12)))] pb-[env(safe-area-inset-bottom)] rounded-t-2xl bg-primary shadow-2xl shadow-primary/60 ring-1 ring-fg-primary/10""
    >
      <div class=" flex justify-baseline pt-3"><div class=" h-1 w-10 rounded-full bg-secondary/80" /></div>
      <div class=" flex justify-between px-4 pt-2 pb-4">
        <div class="  flex-none text-lg text-fg-muted" @click="editOpened = false">{{ t('common.cancel') }}</div>
        <div class=" flex-1 text-lg text-center font-semibold">{{ t('playlist.edit') }}</div>
        <div class="  flex-none text-lg text-accent" @click="handleSubmit">
          <span v-if="updating" class="icon-[svg-spinners--3-dots-scale]"></span>
          <span v-else>{{ t('common.submit') }}</span>
        </div>
      </div>

      <div class=" flex gap-4 px-4">
        <div class=" flex gap-4 justify-between">
          <div class=" text-fg-primary">{{ t('playlist.cover') }}</div>
          <div class=" flex-1">
            <button
              class=" group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 transition active:scale-95"
              :class="coverPreview ? '' : 'border-2 border-dashed border-border bg-secondary/50'"
              @click="fileInput?.click()"
            >
              <img v-if="coverPreview" :src="coverPreview" alt="" class="h-full w-full object-cover" />
              <div v-else class="flex h-full flex-col items-center justify-center gap-1 text-fg-muted">
                <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                </svg>
                <span class="text-[10px] font-medium">{{ t('playlist.cover_tip') }}</span>
              </div>
              <div v-if="coverPreview" class="absolute inset-0 flex items-center justify-center bg-primary/50 opacity-0 transition group-hover:opacity-100 group-active:opacity-100">
                <span class="text-[11px] font-medium text-fg-primary">{{ t('common.change') }}</span>
              </div>
            </button>
            <input type="file" class=" hidden" ref="fileInput" accept="image/*" @change="onFileChange" />
          </div>
        </div>

        <div class=" flex gap-4 mt-4 justify-between">
          <div class=" text-fg-primary">{{ t('playlist.title') }}</div>
          <input 
            v-model.trim="editTitle" maxlength="50" 
            class=" flex-1 w-full rounded-lg bg-fg-primary/5 px-3.5 py-2 text-sm text-fg-primary outline-none ring-1 ring-fg-primary/10 transition placeholder:text-fg-muted focus:ring-2 focus:ring-accent/60" 
            :placeholder="`${t('playlist.title_placeholder')} *`"
          />
        </div>

        <div class=" flex gap-4 mt-4 justify-between">
          <div class=" text-fg-primary">{{ t('playlist.comment') }}</div>
          <textarea 
            v-model="editComment" rows="2" maxlength="200" :placeholder="t('playlist.comment_placeholder')"
            class=" flex-1 w-full resize-none rounded-lg bg-fg-primary/5 px-3.5 py-2 text-sm text-fg-primary outline-none ring-1 ring-fg-primary/10 transition placeholder:text-fg-muted focus:ring-2 focus:ring-accent/60"
          />
        </div>
      </div>
    </section>
  </transition>
</template>