<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <div class=" px-2 pt-[calc(env(safe-area-inset-top)+10px)]">
    <div class=" flex justify-between">
      <button
        class="shrink-0 rounded-full p-2 text-fg-secondary ring-1 ring-primary/10 backdrop-blur-sm transition hover:bg-fg-primary/85 active:scale-90"
        :aria-label="t('common.back')"
        @click="router.back()"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <div class=" flex-1 text-lg font-semibold text-right">{{ t('settings.about.item') }}</div>
    </div>
    <div class=" mt-4 p-2">
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
    </div>
  </div>
</template>