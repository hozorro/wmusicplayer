import { storeToRefs } from "pinia";
import { useMusicStore } from "@/store/music";

export const useTheme = () => {
  const musicStore = useMusicStore();
  const { theme, isDark } = storeToRefs(musicStore);

  return { 
    theme, 
    isDark,
    setTheme: musicStore.setTheme,
    toggleTheme: musicStore.toggleTheme
   };
}