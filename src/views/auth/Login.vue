<script setup lang="ts">
import { ref, onMounted } from 'vue' 
import { useRoute, useRouter } from 'vue-router'
import { useMusicStore } from '@/store/music';
import { useAuthStore } from '@/store/auth';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const store = useMusicStore();
onMounted(() => {
  store.playerBoxShow = false
});

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

async function handleLogin() {
  errorMsg.value = ''
  const result = await authStore.login(username.value, password.value)

  if (result.success) {
    const redirect = route.query.redirect as string
    const targetPath = redirect || '/'
    router.push(targetPath)
  } else {
    errorMsg.value = result.message
  }
}
</script>

<template>
  <div class=" w-full h-svh pt-30">
    <div class=" w-80 h-80 mx-auto flex flex-col items-center justify-center">
      <div class=" text-center">
        <img src="/favicon.svg" alt="logo" class=" w-20 h-20 mb-4"></img>
      </div>
      <div class=" text-center font-bold text-cyan-500">WMusicPlayer</div>
      <div class=" w-full mt-4">
        <div class=" grid grid-cols-[3rem_1fr] gap-2 items-center">
          <label for="username">{{ t('auth.username') }}</label>
          <input type="text" class=" p-2 rounded-md outline-0 focus: border focus:border-cyan-400" id="username" v-model="username" :placeholder="t('auth.username_placeholder')">
        </div>
        <div class=" grid grid-cols-[3rem_1fr] gap-2 mt-3 items-center">
          <label for="password">{{ t('auth.password') }}</label>
          <input type="password" class=" p-2 rounded-md outline-0 focus: border focus:border-cyan-400" id="password" v-model="password" :placeholder="t('auth.password_placeholder')">
        </div>
        <div class=" w-full mt-4">
          <button class=" w-full h-8 rounded-md bg-cyan-500 text-white" @click="handleLogin">{{ `${t('auth.login')}${authStore.isLogining ? '...' : ''}` }}</button>
        </div>
        <p v-if="errorMsg" class=" mt-2 text-sm text-red-400">{{ errorMsg }} </p>
      </div>
    </div>
  </div>
</template>