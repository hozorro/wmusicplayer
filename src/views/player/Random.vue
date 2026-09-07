<script setup lang="ts">
/**
 * 随机播放页 —— P7.6.3：注册表驱动的模式调音台（A61 修订形态）
 * 带参模式 = 滑块调参 + 触发；零参模式 = 点按即播行。
 * 新增模式 = 注册表(random-model)加一行，本页自动收录。
 */
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import ModeIcon from "@/components/ModeIcon.vue";
import { RANDOM_MODES, type RandomMode } from "@/services/random-model";
import { toPlayTrack } from "@/services/transform";
import { usePlayer } from "@/composables/playback";
import { getModedRandomTracks } from "@/apis/methods/music";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();
const player = usePlayer();

/** 各带参模式的当前值：默认值初始化 */
const paramValues = reactive(
  Object.fromEntries(
    RANDOM_MODES.filter(m => m.param).map(m => [m.key, m.param!.defaultValue])
  )
)

const busy = ref<string | null>(null)
const playedKey = ref<string | null>(null)

/** 轨道填充：已走部分 amber，未走部分白色 10% */
function sliderBg(m: RandomMode): string {
  const p = m.param!
  const pct = ((paramValues[m.key] - p.min) / (p.max - p.min)) * 100
  return `linear-gradient(to right, #96f7e4 ${pct}%, rgba(255,255,255,0.6) ${pct}%)`;
}

async function playRandom(m: RandomMode) {
  if (busy.value !== null) return
  busy.value = m.key
  try {
    const tracks = await getModedRandomTracks(m.key, m.param ? paramValues[m.key] : undefined).send();
    player.playAll(tracks.map(t => toPlayTrack(t)));
    playedKey.value = m.key;
    setTimeout(() => {
      if (playedKey.value === m.key) playedKey.value = null;
    }, 900)
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div class="min-h-dvh">
    <!-- 粘性导航 -->
    <div class="sticky top-0 z-30 border-b border-white/5 backdrop-blur-md">
      <div class="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class="rounded-full p-2 text-fg-secondary transition hover:bg-white/8 hover:text-zinc-50 active:scale-90"
          :aria-label="t('common.back')"
          @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h1 class="min-w-0 flex-1 text-lg font-bold text-fg-primary">{{ t('random.advance') }}</h1>
        <span class="text-xs tabular-nums text-fg-muted">{{ RANDOM_MODES.length }} {{ t('random.mode_count') }}</span>
      </div>
    </div>

    <main class="mx-auto max-w-2xl px-4 pb-32 pt-4">
      <TransitionGroup
        appear
        enter-active-class="transition duration-500 ease-out"
        enter-from-class="opacity-0 translate-y-3"
      >
        <section
          v-for="(m, i) in RANDOM_MODES"
          :key="m.key"
          class="group mb-3 rounded-xl bg-accent/5 p-4 ring-1 ring-white/5 transition hover:bg-white/[0.05] hover:ring-white/10"
          :style="{ transitionDelay: `${i * 50}ms` }"
        >
          <div class="flex items-center gap-3">
            <!-- 模式图标 -->
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent transition-transform duration-200 group-hover:scale-105">
              <ModeIcon :icon="m.icon" class="h-5 w-5" />
            </span>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-fg-primary">{{ m.name }}</p>
              <p class="mt-0.5 text-[11px] text-fg-muted">
                {{ m.description }}
              </p>
            </div>

            <!-- 带参模式：当前值读出 -->
            <span class="text-base font-black tabular-nums text-accent">
              {{ m.param ? m.param.format(paramValues[m.key]) : '' }}
            </span>

            <!-- 触发键：busy 旋转 / 成功对勾闪现 / 常态三角 -->
            <button
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-90 disabled:pointer-events-none disabled:opacity-40"
              :disabled="busy !== null"
              :aria-label="t('random.mode_play', { mode: m.name })"
              @click="playRandom(m)"
            >
              <span v-if="busy === m.key" class="h-4 w-4 animate-spin rounded-full border-2 border-border/30 border-t-primary" />
              <svg v-else-if="playedKey === m.key" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else viewBox="0 0 24 24" class="ml-0.5 h-5 w-5" fill="currentColor"><path d="M6 5.5v13l9-6.5z" /></svg>
            </button>
          </div>

          <!-- 调参滑块：仅带参模式渲染 -->
          <div v-if="m.param" class="mt-4">
            <input
              type="range"
              :min="m.param.min" :max="m.param.max" :step="m.param.step"
              v-model.number="paramValues[m.key]"
              :aria-label="`${m.name} ${t('random.weight')}`"
              class="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none
                     [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
                     [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-black/40
                     [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
                     [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-125
                     [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
              :style="{ background: sliderBg(m) }"
            />
            <div class="mt-1.5 flex justify-between text-[10px] tabular-nums text-fg-muted">
              <span>{{ m.param.format(m.param.min) }}</span>
              <span>{{ m.param.format(m.param.max) }}</span>
            </div>
          </div>
        </section>
      </TransitionGroup>

      <p class="pt-2 text-center text-[11px] text-fg-muted">
        {{ t('random.random_hint') }}
      </p>
    </main>
  </div>
</template>