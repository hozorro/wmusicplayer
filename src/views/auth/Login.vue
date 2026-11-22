<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/store/auth'

const { t } = useI18n()

// 品牌固定文案：任何语言下都保持英文，不参与 i18n 切换
const BRAND_BADGE = 'pulse engine  v2.0'
const BRAND_TAGLINE = 'A distinctive music player'
const LOGO_SRC = '/icons/icon-192.png'

const username = ref('')
const password = ref('')
const showPassword = ref(false)

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
const isBusy = computed(() => authStore.isLogining)

const errorMessage = computed(() => {
  const errors = authStore.loginErrors
  if (!errors) return ''
  if (typeof errors.form === 'string') return errors.form
  const fields = errors.fields as Record<string, string[]> | undefined
  return fields ? (Object.values(fields).flat()[0] ?? '') : ''
})

const waveBars = [
  { height: 'h-3', color: 'bg-pulse-secondary', delay: '0ms' },
  { height: 'h-5', color: 'bg-pulse-tertiary', delay: '120ms' },
  { height: 'h-7', color: 'bg-pulse-primary', delay: '240ms' },
  { height: 'h-4', color: 'bg-pulse-primary-container', delay: '80ms' },
  { height: 'h-6', color: 'bg-pulse-tertiary', delay: '310ms' },
  { height: 'h-3', color: 'bg-pulse-secondary', delay: '190ms' },
  { height: 'h-6', color: 'bg-pulse-primary', delay: '270ms' },
  { height: 'h-4', color: 'bg-pulse-tertiary', delay: '150ms' },
  { height: 'h-2', color: 'bg-pulse-secondary', delay: '90ms' },
]

async function handleLogin() {
  if (isBusy.value) return
  const ok = await authStore.login(username.value, password.value)
  if (!ok) return
  const redirect = route.query.redirect as string | undefined
  void router.push(redirect || '/')
}

function clearUsername() {
  username.value = ''
}
</script>

<template>
  <div class="login-ambient fixed inset-0 z-0 overflow-y-auto overscroll-contain bg-pulse-surface text-pulse-on-surface">
    <main class="login-page mx-auto flex min-h-svh w-full max-w-[420px] flex-col px-5">
      <!-- 顶部品牌徽标：固定英文，不做 i18n -->
      <div class="flex w-full items-center justify-between pt-1">
        <div class="inline-flex items-center gap-1.5 rounded-full bg-pulse-surface-high px-3 py-1 shadow-sm">
          <span class="size-1.5 animate-pulse rounded-full bg-pulse-tertiary motion-reduce:animate-none" aria-hidden="true"></span>
          <span class="whitespace-pre text-[10px] font-bold uppercase tracking-[0.06em] text-pulse-tertiary">{{ BRAND_BADGE }}</span>
        </div>
      </div>

      <!-- 品牌主视觉 -->
      <section class="flex flex-col items-center mt-6 pt-6 text-center">
        <div class="relative mb-3 flex items-center justify-center">
          <div
            class="relative size-20 rounded-full bg-pulse-surface-low p-1 shadow-[0_0_28px_rgba(0,109,119,0.45)] ring-1 ring-pulse-primary/30"
          >
            <img
              :src="LOGO_SRC"
              alt="WMusicPlayer"
              width="80"
              height="80"
              decoding="async"
              class="size-full rounded-full object-cover"
            />
          </div>
          <span class="icon-[solar--music-note-outline] absolute -top-1 -right-4 text-lg text-pulse-tertiary opacity-70" aria-hidden="true"></span>
          <span class="icon-[solar--graph-outline] absolute -bottom-1 -left-3 text-sm text-pulse-primary opacity-60" aria-hidden="true"></span>
        </div>

        <div class="mb-3 flex h-7 items-end justify-center gap-1 px-4" aria-hidden="true">
          <span
            v-for="(bar, index) in waveBars"
            :key="index"
            class="w-1 animate-pulse rounded-full motion-reduce:animate-none"
            :class="[bar.height, bar.color]"
            :style="{ animationDelay: bar.delay }"
          ></span>
        </div>

        <h1 class="text-[28px] font-extrabold leading-[34px] tracking-[-0.02em]">{{ t('auth.headline') }}</h1>
        <p class="mt-1 max-w-[280px] text-xs leading-4 text-pulse-on-surface-variant">{{ t('auth.subtitle') }}</p>
      </section>

      <!-- 登录表单 -->
      <form class="mt-6 flex w-full flex-col gap-3" @submit.prevent="handleLogin">
        <div class="flex flex-col gap-1">
          <label for="username" class="pl-1 text-[10px] font-bold uppercase tracking-wider text-pulse-on-surface-variant">
            {{ t('auth.username') }}
          </label>
          <div class="flex w-full items-center rounded-full bg-pulse-surface-container px-4 py-2.5 transition-colors focus-within:bg-pulse-surface-high focus-within:ring-2 focus-within:ring-pulse-primary-container">
            <span class="icon-[solar--headphones-round-outline] mr-3 shrink-0 text-xl text-pulse-secondary" aria-hidden="true"></span>
            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              autocapitalize="off"
              spellcheck="false"
              required
              :placeholder="t('auth.username_placeholder')"
              class="w-full min-w-0 bg-transparent text-sm text-pulse-on-surface placeholder:text-pulse-outline focus:outline-none"
            />
            <button
              v-if="username"
              type="button"
              class="ml-1 shrink-0 text-pulse-outline transition-colors hover:text-pulse-on-surface"
              :aria-label="t('common.clear')"
              @click="clearUsername"
            >
              <span class="icon-[solar--close-circle-outline] text-sm" aria-hidden="true"></span>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label for="password" class="pl-1 text-[10px] font-bold uppercase tracking-wider text-pulse-on-surface-variant">
            {{ t('auth.password') }}
          </label>
          <div class="flex w-full items-center rounded-full bg-pulse-surface-container px-4 py-2.5 transition-colors focus-within:bg-pulse-surface-high focus-within:ring-2 focus-within:ring-pulse-primary-container">
            <span class="icon-[solar--lock-password-outline] mr-3 shrink-0 text-xl text-pulse-secondary" aria-hidden="true"></span>
            <input
              id="password"
              v-model="password"
              :type="passwordType"
              autocomplete="current-password"
              required
              :placeholder="t('auth.password_placeholder')"
              class="w-full min-w-0 bg-transparent text-sm text-pulse-on-surface placeholder:text-pulse-outline focus:outline-none"
            />
            <button
              type="button"
              class="ml-1 shrink-0 text-pulse-outline transition-colors hover:text-pulse-tertiary"
              :aria-label="t(showPassword ? 'auth.hide_password' : 'auth.show_password')"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <span
                :class="showPassword ? 'icon-[solar--eye-closed-outline]' : 'icon-[solar--eye-outline]'"
                class="text-lg"
                aria-hidden="true"
              ></span>
            </button>
          </div>
        </div>

        <p v-if="errorMessage" role="alert" class="px-1 text-xs text-pulse-error">{{ errorMessage }}</p>

        <button
          type="submit"
          :disabled="isBusy"
          :aria-busy="isBusy"
          class="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pulse-primary-container via-pulse-secondary-container to-pulse-tertiary-container px-6 py-3 text-sm font-semibold text-pulse-on-primary-container shadow-lg shadow-pulse-primary-container/30 transition active:scale-[0.98] hover:shadow-pulse-tertiary/25 disabled:pointer-events-none disabled:opacity-50"
        >
          <span class="icon-[solar--soundwave-linear] text-xl" aria-hidden="true"></span>
          <span>{{ isBusy ? t('auth.logging_in') : t('auth.login') }}</span>
          <span class="icon-[solar--alt-arrow-right-linear] text-lg" aria-hidden="true"></span>
        </button>
      </form>

      <!-- 底部分隔标语：固定英文，不做 i18n -->
      <div class="my-6 flex w-full items-center justify-center gap-2 overflow-hidden">
        <svg class="h-5 min-w-0 max-w-[70px] flex-1 text-pulse-tertiary opacity-70" fill="none" preserveAspectRatio="none" stroke="currentColor" viewBox="0 0 100 24" aria-hidden="true">
          <path d="M2,12 Q20,6 40,12 T70,12 T85,9 T98,12" stroke-linecap="round" stroke-width="1.5"></path>
        </svg>
        <span class="shrink-0 px-1 text-center text-[10px] font-bold uppercase tracking-wider text-pulse-on-surface-variant">{{ BRAND_TAGLINE }}</span>
        <svg class="h-5 min-w-0 max-w-[70px] flex-1 text-pulse-tertiary opacity-70" fill="none" preserveAspectRatio="none" stroke="currentColor" viewBox="0 0 100 24" aria-hidden="true">
          <path d="M2,12 Q15,15 30,12 T60,12 T80,15 T98,12" stroke-linecap="round" stroke-width="1.5"></path>
        </svg>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* 静态径向渐变替代设计稿里两层 blur-3xl 光晕：视觉接近，但不产生大面积高斯模糊合成层 */
.login-ambient {
  background-image:
    radial-gradient(60% 34% at 50% -6%, rgb(0 109 119 / 0.24), transparent 70%),
    radial-gradient(48% 26% at 100% 34%, rgb(0 111 95 / 0.16), transparent 72%);
}

.login-page {
  padding-top: max(1rem, env(safe-area-inset-top));
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
}
</style>
