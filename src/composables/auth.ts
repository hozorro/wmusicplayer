import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';

/**
 * 主动退出登录：先撤销服务端 refresh token 并清空本地登录态，再跳登录页。
 * 使用 pending 锁防止确认弹窗被连续点击时重复发起请求。
 */
export function useLogout() {
  const authStore = useAuthStore();
  const router = useRouter();
  const pending = ref(false);

  async function logout(): Promise<void> {
    if (pending.value) return
    pending.value = true
    try {
      await authStore.logout()
      await router.replace({ path: '/login' })
    } catch {
      // 本地登录态已清空，跳转失败时由路由守卫在下一次导航兜底
    } finally {
      pending.value = false
    }
  }

  return { pending, logout };
}
