<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRequest, useForm } from 'alova/client'
import { useI18n } from 'vue-i18n'
import { useMusicStore } from '@/store/music'
import { getPlaylists, addPlaylist} from '@/apis/methods/music'
import { addPlaylist as addPlaylistLocal, updateLocalMeta } from '@/apis/methods/idb-locals'
import WMessage from '@/composables/message'

const { t } = useI18n()
const router = useRouter()
const musicStore = useMusicStore()

const { data: playlists, send: refreshList } = useRequest(getPlaylists)

const openCreate = ref(false)
const coverPreview = ref<string>()
const fileInput = ref<HTMLInputElement>()
const coverFile = ref<File | null>(null)

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
  data: newPlaylist,
  form,
  send: submit,
  uploading,
  onSuccess,
  onError,
} = useForm(
  (data) => {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('comment', data.comment)
    if(data.cover){
      formData.append('cover', data.cover)
    }
    return addPlaylist(formData)
  },
  {
    initialForm:{
      title: '',
      comment: '',
      cover: null as File | null
    },
    resetAfterSubmiting: true,
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
  openCreate.value = false
  musicStore.playerBoxShow = true

  if (musicStore.isIDBReady) {
    setTimeout(() => {
      if(newPlaylist.value){
        addPlaylistLocal({
          id: newPlaylist.value.id,
          title: newPlaylist.value.title,
          cover: newPlaylist.value.cover,
          comment: newPlaylist.value.comment,
          created_at: newPlaylist.value.created_at,
          track_ids: [],
          hits: [],
          hit_count: 0
        }).then(() => {
          updateLocalMeta('playlist')
        })
      }
    }, 1000);
  }

  refreshList()
})
onError(() => {
  WMessage(t('errors.fail_create'), 'error')
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
  <div class="min-h-dvh">
    <div class="sticky top-0 z-30 border-b border-white/5 bg-zinc-950">
      <div class="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class="rounded-full p-2 text-zinc-300 transition hover:bg-white/8 hover:text-zinc-50 active:scale-90"
          aria-label="返回" @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h1 class="min-w-0 flex-1 text-lg font-bold text-zinc-50">{{ t('player.playlist') }}</h1>
        <button
          class="rounded-full bg-amber-400 p-2 text-zinc-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 active:scale-90"
          aria-label="新建歌单" @click="openCreate = true"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
    </div>

    <main class="mx-auto max-w-2xl px-4 pb-32 pt-4">
      <!-- 网格 -->
      <div v-if="playlists.length" class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
        <button v-for="p in playlists" :key="p.id" class="group text-left" @click="router.push(`/playlist/${p.id}`)">
          <div class="aspect-square overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/5 transition group-active:scale-[0.97]">
            <img v-if="p.cover" :src="p.cover" alt="" class="h-full w-full object-cover" />
            <svg v-else viewBox="0 0 24 24" class="m-auto mt-[32%] h-10 w-10 text-zinc-600" fill="currentColor">
              <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
            </svg>
          </div>
          <p class="mt-2 truncate text-sm font-semibold text-zinc-100">{{ p.title }}</p>
          <p v-if="p.track_count != null" class="mt-0.5 text-xs tabular-nums text-zinc-500">{{ p.track_count }} 首</p>
        </button>
      </div>

      <!-- 空态：直接给出创建入口 -->
      <div v-else-if="!loading" class="flex flex-col items-center gap-4 py-24">
        <svg viewBox="0 0 24 24" class="h-12 w-12 text-zinc-700" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" />
        </svg>
        <p class="text-sm text-zinc-500">还没有歌单</p>
        <button
          class="rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 active:scale-95"
          @click="openCreate = true"
        >
          创建第一个歌单
        </button>
      </div>

      <!-- 骨架 -->
      <div v-else class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
        <div v-for="n in 6" :key="n" class="animate-pulse">
          <div class="aspect-square rounded-xl bg-zinc-800/60" />
          <div class="mt-2 h-4 w-2/3 rounded bg-zinc-800/60" />
        </div>
      </div>
    </main>
  </div>
  <!-- create playlist -->
  <transition
    enter-active-class="transition-opacity duration-250" enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-200" leave-to-class="opacity-0"
  >
    <section 
      v-if="openCreate" 
      class=" absolute inset-x-0 bottom-0 h-[calc(100%-(--spacing(12)))] pb-[env(safe-area-inset-bottom)] rounded-t-2xl bg-zinc-900 shadow-2xl shadow-black/60 ring-1 ring-white/10"
    >
      <div class=" flex justify-baseline pt-3"><div class=" h-1 w-10 rounded-full bg-zinc-600" /></div>
      <div class=" flex justify-between px-4 pt-2 pb-4">
        <div class="  flex-none text-lg text-zinc-300" @click="openCreate = false">{{ t('common.cancel') }}</div>
        <div class=" flex-1 text-lg text-center font-semibold">{{ t('playlist.create') }}</div>
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