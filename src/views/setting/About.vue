<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class=" px-2 pt-[calc(env(safe-area-inset-top)+10px)]">
    <div class=" flex justify-between">
      <router-link to="/setting" class=" flex-none text-lg font-semibold">
        <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span>
      </router-link>
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