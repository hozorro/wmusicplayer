<script setup lang="ts">
import { onMounted } from 'vue' 
import { useRouter } from 'vue-router'
import { useForm } from 'alova/client';
import { useMusicStore } from '@/store/music';
import { login } from '@/apis/methods/music';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const store = useMusicStore();
onMounted(() => {
  store.playerBoxShow = false
});

const router = useRouter()
const { form, send: Login, onSuccess } = useForm(
  formData => login(formData.username, formData.password),
  {
    initialForm: { username: '', password: ''}
  }
)
onSuccess(() => {
  router.push('/')
})
</script>

<template>
  <div class=" w-full h-svh">
    <div class=" w-80 h-80 mx-auto mt-[calc(15svh)] flex flex-col items-center justify-center">
      <div class=" text-center">
        <img src="/favicon.svg" alt="logo" class=" w-20 h-20 mb-4"></img>
      </div>
      <div class=" text-center font-bold text-cyan-500">WMusicPlayer</div>
      <div class=" w-full mt-4">
        <div class=" grid grid-cols-[3rem_1fr] gap-2 items-center">
          <label for="username">{{ t('auth.username') }}</label>
          <input type="text" class=" p-2 rounded-md outline-0 focus: border focus:border-cyan-400" id="username" v-model="form.username" :placeholder="t('auth.username_placeholder')">
        </div>
        <div class=" grid grid-cols-[3rem_1fr] gap-2 mt-3 items-center">
          <label for="password">{{ t('auth.password') }}</label>
          <input type="password" class=" p-2 rounded-md outline-0 focus: border focus:border-cyan-400" id="password" v-model="form.password" :placeholder="t('auth.password_placeholder')">
        </div>
        <div class=" w-full mt-4">
          <button class=" w-full h-8 rounded-md bg-cyan-500 text-white" @click="Login">{{ t('auth.login') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>