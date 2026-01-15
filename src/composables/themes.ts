import { computed, watch } from "vue";
import { useMusicStore } from "@/store/music";

const musicStore = useMusicStore()

export const useTheme = () => {
  const theme = computed({
    get() { return musicStore.isDark ? "dark" : "light" },
    set(newTheme) { musicStore.isDark = newTheme === "dark" } 
  })
  const toggleTheme = () => {
    theme.value = theme.value === "light" ? "dark" : "light";
  };
  watch(
    theme,
    (newTheme) => {
      document.documentElement.className = newTheme;
    },
    { immediate: true }
  );
  return { theme, toggleTheme };
}