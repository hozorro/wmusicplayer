<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

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
        <h1 class=" text-lg font-bold text-fg-primary">{{ t('settings.help.item') }}</h1>
      </div>
    </div>

    <main class=" mx-auto max-w-2xl px-4 pb-32 pt-6">
      <h1>{{ t('settings.help.install') }}</h1>
      <p>{{ t('settings.help.install_content') }}</p>
      <h1>{{ t('settings.help.first_run') }}</h1>
      <ul>
        <li>{{ t('settings.help.first_run_content_1') }}</li>
        <li>{{ t('settings.help.first_run_content_2') }}</li>
      </ul>
      <h1>{{ t('settings.help.local_db') }}</h1>
      <ul>
        <li>{{ t('settings.help.local_db_content_1') }}</li>
        <li>{{ t('settings.help.local_db_content_2') }}</li>
        <li>{{ t('settings.help.local_db_content_3') }}</li>
      </ul>
      <h1>{{ t('settings.help.update') }}</h1>
      <p>{{ t('settings.help.update_content') }}</p>
    </main>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
h1 {
  @apply text-xl font-semibold my-2;
}
p {
  @apply text-base ml-2;
}
ul {
  @apply ml-2;
}
li {
  @apply ml-2 list-disc;
}
</style>