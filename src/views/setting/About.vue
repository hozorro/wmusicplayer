<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <div class=" min-h-dvh">
    <!-- 粘性导航 -->
    <div class=" sticky top-0 z-30 border-b border-fg-primary/5 backdrop-blur-md">
      <div class=" mx-auto flex max-w-2xl items-center gap-2 pl-2 pr-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class=" rounded-full p-2 text-fg-muted transition hover:bg-fg-primary/8 hover:text-fg-primary active:scale-90"
          :aria-label="t('common.back')"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 class=" text-lg font-bold text-fg-primary">{{ t('settings.about.item') }}</h1>
      </div>
    </div>

    <main class=" mx-auto max-w-2xl px-4 pb-32 pt-6">
      <p class=" p-2">
        <span class=" font-bold text-cyan-700">WMusicPlayer</span> {{ t('settings.about.introduction') }}
      </p>
      <p class=" p-2">
        <span class=" font-bold text-cyan-700">WMusicPlayer</span> {{ t('settings.about.characteristics') }}<br>
      </p>
      <ul class=" ml-6">
        <li class=" list-disc">{{ t('settings.about.characteristics_1') }}</li>
        <li class=" list-disc">{{ t('settings.about.characteristics_2') }}</li>
        <li class=" list-disc">{{ t('settings.about.characteristics_3') }}</li>
        <li class=" list-disc">{{ t('settings.about.characteristics_4') }}</li>
        <li class=" list-disc">{{ t('settings.about.characteristics_5') }}</li>
        <li class=" list-disc">{{ t('settings.about.characteristics_6') }}</li>
        <li class=" list-disc">{{ t('settings.about.characteristics_7') }}</li>
        <li class=" list-disc">{{ t('settings.about.characteristics_8') }}</li>
      </ul>
      <p class=" p-2">
        <span class=" font-bold text-cyan-700">WMusicPlayer</span> {{ t('settings.about.author', { author: 'enauvy'}) }}
      </p>
    </main>
  </div>
</template>