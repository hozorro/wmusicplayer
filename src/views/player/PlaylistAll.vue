<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRequest } from 'alova/client'
import { useI18n } from 'vue-i18n'
import { getPlaylists } from '@/apis/methods/music'
import { createPlaylist } from '@/idb/app-api'
import { toast } from '@/services/toast'
import ImageCropper from '@/components/ImageCropper.vue'

const { t } = useI18n()
const router = useRouter()

const { data: playlists, send: refreshList } = useRequest(getPlaylists)

const openCreate = ref(false)
const title = ref('')
const comment = ref('')
const coverPreview = ref<string>()
const coverFile = ref<File | null>(null)
const creating = ref(false)

function onCrop(file: File) {
  coverFile.value = file
  if (coverPreview.value?.startsWith('blob:')) {
    URL.revokeObjectURL(coverPreview.value)
  }
  coverPreview.value = URL.createObjectURL(file)
}


async function handleSubmit() {
  if(!title.value.trim()){
    toast(t('errors.playlist_title_empty'), 'error')
    return
  }
  creating.value = true
  const res = await createPlaylist({ title: title.value.trim(), comment: comment.value.trim() }, coverFile.value)
  if (res.ok) {
    creating.value = false
    openCreate.value = false
    refreshList()
  } else {
    toast(res.reason, 'error')
    creating.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh">
    <div class="sticky top-0 z-30 border-b border-white/5">
      <div class="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class="rounded-full p-2 text-fg-primary transition hover:bg-white/8 hover:text-fg-primary active:scale-90"
          :aria-label="t('common.back')" @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h1 class="min-w-0 flex-1 text-lg font-bold text-fg-primary">{{ t('player.playlist') }}</h1>
        <button
          class="rounded-full bg-accent p-2 text-fg-primary shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-90"
          :aria-label="t('playlist.create')" @click="openCreate = true"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
    </div>

    <main class="mx-auto max-w-2xl px-4 pb-32 pt-4">
      <!-- 网格 -->
      <div v-if="playlists?.length" class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
        <button v-for="p in playlists" :key="p.id" class="group text-left" @click="router.push(`/playlist/${p.id}`)">
          <div class="aspect-square overflow-hidden rounded-xl bg-secondary ring-1 ring-fg-primary/5 transition group-active:scale-[0.97]">
            <img v-if="p.cover" :src="p.cover" alt="" class="h-full w-full object-cover" />
            <svg v-else viewBox="0 0 24 24" class="m-auto mt-[32%] h-10 w-10 text-fg-muted" fill="currentColor">
              <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
            </svg>
          </div>
          <p class="mt-2 truncate text-sm font-semibold text-fg-primary">{{ p.title }}</p>
          <p v-if="p.track_count != null" class="mt-0.5 text-xs tabular-nums text-fg-secondary">{{ p.track_count }} 首</p>
        </button>
      </div>

      <!-- 空态：直接给出创建入口 -->
      <div v-else-if="!creating" class="flex flex-col items-center gap-4 py-24">
        <svg viewBox="0 0 24 24" class="h-12 w-12 text-secondary" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" />
        </svg>
        <p class="text-sm text-fg-secondary">{{ t('playlist.empty') }}</p>
        <button
          class="rounded-full bg-accent px-5 py-2 text-sm font-bold text-fg-primary shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-95"
          @click="openCreate = true"
        >
          {{ t('playlist.create_first') }}
        </button>
      </div>

      <!-- 骨架 -->
      <div v-else class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
        <div v-for="n in 6" :key="n" class="animate-pulse">
          <div class="aspect-square rounded-xl bg-secondary/60" />
          <div class="mt-2 h-4 w-2/3 rounded bg-secondary/60" />
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
      class=" absolute inset-x-0 bottom-0 h-[calc(100%-(--spacing(12)))] pb-[env(safe-area-inset-bottom)] rounded-t-2xl bg-card shadow-2xl shadow-black/80 ring-1 ring-white/10"
    >
      <div class=" flex justify-center pt-3"><div class=" h-1 w-10 rounded-full bg-secondary" /></div>
      <div class=" flex justify-between px-4 pt-2 pb-4">
        <div class="  flex-none text-lg text-fg-muted" @click="openCreate = false">{{ t('common.cancel') }}</div>
        <div class=" flex-1 text-lg text-center font-semibold">{{ t('playlist.create') }}</div>
        <div class="  flex-none text-lg text-accent" @click="handleSubmit">
          <span v-if="creating" class="icon-[svg-spinners--3-dots-scale]"></span>
          <span v-else>{{ t('common.submit') }}</span>
        </div>
      </div>

      <div class=" mt-4 px-4">
        <div class=" flex gap-4 justify-between">
          <div class=" text-fg-primary">{{ t('playlist.cover') }}</div>
          <div class=" flex-1">
            <ImageCropper
              v-model="coverPreview"
              @crop="onCrop"
            />
          </div>
        </div>
        <div class=" flex gap-4 mt-4 justify-between">
          <div class=" text-fg-primary">{{ t('playlist.title') }}</div>
          <input 
            v-model.trim="title" maxlength="50" 
            class=" flex-1 rounded-lg bg-secondary/50 px-3.5 py-2 text-[16px] text-fg-primary outline-none ring-1 ring-fg-primary/10 transition placeholder:text-fg-secondary focus:ring-2 focus:ring-accent/60" 
            :placeholder="`${t('playlist.title_placeholder')} *`"
          />
        </div>
        <div class=" flex gap-4 mt-4 justify-between">
          <div class=" text-fg-primary">{{ t('playlist.comment') }}</div>
          <textarea 
            v-model="comment" rows="2" maxlength="200" :placeholder="t('playlist.comment_placeholder')"
            class=" flex-1 rounded-lg bg-secondary/50 px-3.5 py-2 text-[16px] text-fg-primary outline-none ring-1 ring-fg-primary/10 transition placeholder:text-fg-secondary focus:ring-2 focus:ring-accent/60"
          />
        </div>
      </div>
    </section>
  </transition>
</template>