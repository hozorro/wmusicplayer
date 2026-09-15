<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getNeteasePlaylist, matchNeteaseTracks, createPlaylistFromNetease } from '@/apis/methods/music'
import { toast } from '@/services/toast'
import { coverUrl } from '@/services/transform'

const { t } = useI18n()
const router = useRouter()

// 步骤状态
const step = ref(1)
const loading = ref(false)

// 步骤1: 输入歌单ID或分享链接
const inputText = ref('')
const playlistInfo = ref<NeteasePlaylistResponse>()

// 步骤2: 匹配结果
const matchResult = ref<NeteaseMatchResponse>()
const selectedTracks = ref<Map<number, number | null>>(new Map()) // netease_index -> track_id | null

// 步骤3: 创建歌单
const title = ref('')
const comment = ref('')
const creating = ref(false)

// 计算属性
const matchedTracks = computed(() => matchResult.value?.matched || [])
const unmatchedTracks = computed(() => matchResult.value?.unmatched || [])
const importCount = computed(() => {
  let count = 0
  selectedTracks.value.forEach(v => { if (v !== null) count++ })
  return count
})

// 从输入中提取歌单ID或分享链接
function parseInput(input: string): { playlistId?: number; shareText?: string } {
  const trimmed = input.trim()
  
  // 尝试解析为纯数字ID
  const id = parseInt(trimmed)
  if (!isNaN(id) && id.toString() === trimmed) {
    return { playlistId: id }
  }
  
  // 检查是否包含网易云分享链接特征
  // 分享链接格式: "分享歌单: 震撼音乐 https://163cn.tv/abcdefgh (@网易云音乐)"
  // 或包含 music.163.com 链接
  if (trimmed.includes('163cn.tv') || trimmed.includes('music.163.com')) {
    // 安全处理：移除可能的HTML标签和脚本，只保留纯文本
    const sanitized = trimmed
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/javascript:/gi, '') // 移除javascript:协议
      .replace(/on\w+\s*=/gi, '') // 移除事件处理器
      .trim()
    return { shareText: sanitized }
  }
  
  // 如果包含数字，尝试提取
  const match = trimmed.match(/\d{5,}/)
  if (match) {
    return { playlistId: parseInt(match[0]) }
  }
  
  return {}
}

// 获取歌单信息
async function fetchPlaylist() {
  const { playlistId, shareText } = parseInput(inputText.value)
  
  if (!playlistId && !shareText) {
    toast(t('playlist.invalid_playlist_id'), 'error')
    return
  }
  
  loading.value = true
  try {
    const res = await getNeteasePlaylist({ playlist_id: playlistId, share_text: shareText })
    if (res) {
      playlistInfo.value = res
      title.value = res.name
    } else {
      toast(t('playlist.playlist_not_found'), 'error')
    }
  } catch (e) {
    toast(t('playlist.import_failed'), 'error')
  } finally {
    loading.value = false
  }
}

// 匹配歌曲
async function doMatch() {
  if (!playlistInfo.value) return
  
  loading.value = true
  try {
    const tracks = playlistInfo.value.tracks.map(t => ({
      name: t.name,
      mainTitle: t.mainTitle,
      artists: t.artists,
      album: t.album
    }))
    
    const res = await matchNeteaseTracks({ tracks })
    if (res) {
      matchResult.value = res
      // 默认选择第一个候选
      res.matched.forEach(m => {
        if (m.candidates.length > 0) {
          selectedTracks.value.set(m.netease_index, m.candidates[0].track_id)
        } else {
          selectedTracks.value.set(m.netease_index, null)
        }
      })
      step.value = 2
    }
  } catch (e) {
    toast(t('playlist.import_failed'), 'error')
  } finally {
    loading.value = false
  }
}

// 选择候选
function selectCandidate(neteaseIndex: number, trackId: number | null) {
  selectedTracks.value.set(neteaseIndex, trackId)
}

// 获取选中的候选
function getSelectedCandidate(neteaseIndex: number): number | null {
  return selectedTracks.value.get(neteaseIndex) ?? null
}

// 创建歌单
async function handleCreate() {
  if (!title.value.trim()) {
    toast(t('errors.playlist_title_empty'), 'error')
    return
  }
  
  const trackIds: number[] = []
  selectedTracks.value.forEach((trackId, _) => {
    if (trackId !== null && !trackIds.includes(trackId)) trackIds.push(trackId)
  })
  
  if (trackIds.length === 0) {
    toast(t('playlist.no_tracks_to_import'), 'error')
    return
  }
  
  creating.value = true
  try {
    const res = await createPlaylistFromNetease({
      title: title.value.trim(),
      comment: comment.value.trim() || undefined,
      cover_url: playlistInfo.value?.coverImgUrl || undefined,
      tracks: [...new Set(trackIds)]
    })
    
    if (res) {
      toast(t('playlist.import_success'), 'success')
      router.push(`/playlist/${res.id}`)
    }
  } catch (e) {
    toast(t('playlist.import_failed'), 'error')
  } finally {
    creating.value = false
  }
}

// 格式化时长
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="min-h-dvh">
    <!-- 头部 -->
    <div class="sticky top-0 z-30 border-b border-white/5 backdrop-blur-md">
      <div class="mx-auto flex max-w-2xl items-center gap-2 pl-2 pr-4 py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          class="rounded-full p-1 text-fg-primary transition hover:bg-white/8 hover:text-fg-primary active:scale-90"
          :aria-label="t('common.back')" @click="router.back()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h1 class="min-w-0 flex-1 text-lg font-bold text-fg-primary">{{ t('playlist.import_netease') }}</h1>
      </div>
    </div>

    <!-- 步骤指示器 -->
    <div class="mx-auto max-w-2xl px-4 pt-6">
      <div class="flex items-center justify-center gap-2">
        <div class="flex items-center">
          <div 
            class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors"
            :class="step >= 1 ? 'bg-accent text-fg-primary' : 'bg-secondary text-fg-secondary'"
          >1</div>
          <span class="ml-2 text-sm" :class="step >= 1 ? 'text-fg-primary' : 'text-fg-secondary'">{{ t('playlist.step_input_id') }}</span>
        </div>
        <div class="h-0.5 w-8 bg-secondary"></div>
        <div class="flex items-center">
          <div 
            class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors"
            :class="step >= 2 ? 'bg-accent text-fg-primary' : 'bg-secondary text-fg-secondary'"
          >2</div>
          <span class="ml-2 text-sm" :class="step >= 2 ? 'text-fg-primary' : 'text-fg-secondary'">{{ t('playlist.step_confirm_match') }}</span>
        </div>
        <div class="h-0.5 w-8 bg-secondary"></div>
        <div class="flex items-center">
          <div 
            class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors"
            :class="step >= 3 ? 'bg-accent text-fg-primary' : 'bg-secondary text-fg-secondary'"
          >3</div>
          <span class="ml-2 text-sm" :class="step >= 3 ? 'text-fg-primary' : 'text-fg-secondary'">{{ t('playlist.step_create') }}</span>
        </div>
      </div>
      <div class="mt-4 rounded-lg bg-warning/20 ring-1 ring-warning/50 p-2 text-sm text-warning/70">
        {{ t('playlist.create_playlist_tip') }}
      </div>
    </div>

    <main class="mx-auto max-w-2xl px-4 pb-32 pt-6">
      <!-- 步骤1: 输入歌单ID或分享链接 -->
      <div v-if="step === 1" class="space-y-6">
        <div class="space-y-4">
          <label class="block text-sm font-medium text-fg-primary">{{ t('playlist.netease_input_placeholder') }}</label>
          <textarea
            v-model.trim="inputText"
            rows="3"
            class="w-full rounded-lg bg-secondary/50 px-3.5 py-2.5 text-[16px] text-fg-primary outline-none ring-1 ring-fg-primary/10 transition placeholder:text-fg-secondary focus:ring-2 focus:ring-accent/60 resize-none"
            :placeholder="t('playlist.netease_input_hint')"
            @keyup.ctrl.enter="fetchPlaylist"
          />
          <p class="text-xs text-fg-secondary">{{ t('playlist.netease_input_tip') }}</p>
          <button
            class="w-full rounded-full bg-accent py-2.5 text-sm font-bold text-fg-primary shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-95 disabled:opacity-50"
            :disabled="loading || !inputText.trim()"
            @click="fetchPlaylist"
          >
            <span v-if="loading" class="icon-[svg-spinners--3-dots-scale]"></span>
            <span v-else>{{ t('playlist.fetch_playlist') }}</span>
          </button>
        </div>

        <!-- 歌单预览 -->
        <div v-if="playlistInfo" class="rounded-xl bg-card p-4 ring-1 ring-white/10">
          <div class="flex gap-4">
            <div class="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary">
              <img v-if="playlistInfo.coverImgUrl" :src="playlistInfo.coverImgUrl" alt="" class="h-full w-full object-cover" />
              <svg v-else viewBox="0 0 24 24" class="m-auto mt-8 h-8 w-8 text-fg-muted" fill="currentColor">
                <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-lg font-bold text-fg-primary">{{ playlistInfo.name }}</h3>
              <p class="mt-1 text-sm text-fg-secondary">{{ playlistInfo.trackCount }} {{ t('player.unit_track') }}</p>
            </div>
          </div>
          
          <!-- 歌曲列表预览 -->
          <div class="mt-4 max-h-64 overflow-y-auto">
            <div v-for="(track, i) in playlistInfo.tracks.slice(0, 10)" :key="track.id" class="flex items-center gap-2 py-1.5">
              <span class="w-6 text-xs tabular-nums text-fg-secondary">{{ i + 1 }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-fg-primary">{{ track.name }}</p>
                <p class="truncate text-xs text-fg-secondary">{{ track.artists.join(', ') }} - {{ track.album }}</p>
              </div>
              <span class="text-xs tabular-nums text-fg-secondary">{{ formatDuration(track.duration) }}</span>
            </div>
            <div v-if="playlistInfo.tracks.length > 10" class="py-2 text-center text-xs text-fg-secondary">
              ... {{ playlistInfo.tracks.length - 10 }} more
            </div>
          </div>

          <button
            class="mt-4 w-full rounded-full bg-accent py-2.5 text-sm font-bold text-fg-primary shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-95 disabled:opacity-50"
            :disabled="loading"
            @click="doMatch"
          >
            <span v-if="loading" class="icon-[svg-spinners--3-dots-scale]"></span>
            <span v-else>{{ t('playlist.match_tracks') }}</span>
          </button>
        </div>
      </div>

      <!-- 步骤2: 确认匹配 -->
      <div v-else-if="step === 2" class="space-y-4">
        <!-- 统计 -->
        <div class="flex gap-4 rounded-xl bg-card p-4 ring-1 ring-white/10">
          <div class="flex-1 text-center">
            <p class="text-2xl font-bold text-accent">{{ matchResult?.matched_count || 0 }}</p>
            <p class="text-xs text-fg-secondary">{{ t('playlist.matched_count', { count: '' }) }}</p>
          </div>
          <div class="flex-1 text-center">
            <p class="text-2xl font-bold text-fg-muted">{{ matchResult?.unmatched_count || 0 }}</p>
            <p class="text-xs text-fg-secondary">{{ t('playlist.unmatched_count', { count: '' }) }}</p>
          </div>
        </div>

        <!-- 匹配列表 -->
        <div class="space-y-2">
          <div
            v-for="match in matchedTracks"
            :key="match.netease_index"
            class="rounded-xl bg-card p-3 ring-1 ring-white/10"
          >
            <!-- 网易云歌曲信息 -->
            <div class="mb-2 border-b border-white/5 pb-2">
              <p class="text-sm font-medium text-fg-primary">{{ match.netease_name }}</p>
              <p class="text-xs text-fg-secondary">{{ match.netease_artists.join(', ') }} - {{ match.netease_album }}</p>
            </div>
            
            <!-- 候选列表 -->
            <div class="space-y-1">
              <button
                v-for="candidate in match.candidates"
                :key="candidate.track_id"
                class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
                :class="getSelectedCandidate(match.netease_index) === candidate.track_id ? 'bg-accent/20 ring-1 ring-accent/50' : 'hover:bg-white/5'"
                @click="selectCandidate(match.netease_index, candidate.track_id)"
              >
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary">
                  <img v-if="candidate.cover_art_hash" :src="coverUrl('track', candidate.track_id, candidate.cover_art_hash)" alt="" class="h-full w-full object-cover" />
                  <svg v-else viewBox="0 0 24 24" class="m-auto mt-2.5 h-5 w-5 text-fg-muted" fill="currentColor">
                    <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-fg-primary">{{ candidate.title }}</p>
                  <p class="truncate text-xs text-fg-secondary">{{ candidate.artists.join(', ') }} - {{ candidate.album }}</p>
                </div>
                <svg v-if="getSelectedCandidate(match.netease_index) === candidate.track_id" viewBox="0 0 24 24" class="h-5 w-5 shrink-0 text-accent" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              
              <!-- 不导入选项 -->
              <button
                class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
                :class="getSelectedCandidate(match.netease_index) === null ? 'bg-fg-muted/20 ring-1 ring-fg-muted/50' : 'hover:bg-white/5'"
                @click="selectCandidate(match.netease_index, null)"
              >
                <div class="h-10 w-10 shrink-0 rounded bg-secondary/50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" class="h-5 w-5 text-fg-muted" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <span class="text-sm text-fg-muted">{{ t('playlist.no_import') }}</span>
                <svg v-if="getSelectedCandidate(match.netease_index) === null" viewBox="0 0 24 24" class="ml-auto h-5 w-5 shrink-0 text-fg-muted" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 未匹配列表 -->
        <div v-if="unmatchedTracks.length > 0" class="mt-6">
          <h3 class="mb-2 text-sm font-semibold text-fg-muted">{{ t('playlist.unmatched_count', { count: unmatchedTracks.length }) }}</h3>
          <div class="space-y-1">
            <div
              v-for="unmatched in unmatchedTracks"
              :key="unmatched.netease_index"
              class="rounded-lg bg-secondary/30 px-3 py-2"
            >
              <p class="text-sm text-fg-muted">{{ unmatched.netease_name }}</p>
              <p class="text-xs text-fg-muted/70">{{ unmatched.netease_artists.join(', ') }} - {{ unmatched.netease_album }}</p>
            </div>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="flex gap-3 pt-4">
          <button
            class="flex-1 rounded-full bg-secondary py-2.5 text-sm font-bold text-fg-primary transition hover:bg-secondary/90 active:scale-95"
            @click="step = 1"
          >
            {{ t('common.back') }}
          </button>
          <button
            class="flex-1 rounded-full bg-accent py-2.5 text-sm font-bold text-fg-primary shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-95 disabled:opacity-50"
            :disabled="importCount === 0"
            @click="step = 3"
          >
            {{ t('common.submit') }} ({{ importCount }})
          </button>
        </div>
      </div>

      <!-- 步骤3: 创建歌单 -->
      <div v-else-if="step === 3" class="space-y-6">
        <!-- 歌单信息编辑 -->
        <div class="space-y-4">
          <div class="flex gap-4">
            <div class="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary">
              <img v-if="playlistInfo?.coverImgUrl" :src="playlistInfo.coverImgUrl" alt="" class="h-full w-full object-cover" />
              <svg v-else viewBox="0 0 24 24" class="m-auto mt-8 h-8 w-8 text-fg-muted" fill="currentColor">
                <path d="M9 18V6l10-2v11.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15.5" r="2.5" />
              </svg>
            </div>
            <div class="min-w-0 flex-1 space-y-3">
              <input
                v-model.trim="title"
                maxlength="50"
                class="w-full rounded-lg bg-secondary/50 px-3.5 py-2 text-[16px] text-fg-primary outline-none ring-1 ring-fg-primary/10 transition placeholder:text-fg-secondary focus:ring-2 focus:ring-accent/60"
                :placeholder="t('playlist.title_placeholder')"
              />
              <textarea
                v-model="comment"
                rows="2"
                maxlength="200"
                class="w-full rounded-lg bg-secondary/50 px-3.5 py-2 text-[16px] text-fg-primary outline-none ring-1 ring-fg-primary/10 transition placeholder:text-fg-secondary focus:ring-2 focus:ring-accent/60"
                :placeholder="t('playlist.comment_placeholder')"
              />
            </div>
          </div>
        </div>

        <!-- 导入统计 -->
        <div class="rounded-xl bg-card p-4 ring-1 ring-white/10 text-center">
          <p class="text-lg font-bold text-fg-primary">{{ importCount }} {{ t('player.unit_track') }}</p>
          <p class="text-sm text-fg-secondary">{{ t('playlist.matched_count', { count: importCount }) }}</p>
        </div>

        <!-- 按钮 -->
        <div class="flex gap-3">
          <button
            class="flex-1 rounded-full bg-secondary py-2.5 text-sm font-bold text-fg-primary transition hover:bg-secondary/90 active:scale-95"
            @click="step = 2"
          >
            {{ t('common.back') }}
          </button>
          <button
            class="flex-1 rounded-full bg-accent py-2.5 text-sm font-bold text-fg-primary shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-95 disabled:opacity-50"
            :disabled="creating || !title.trim()"
            @click="handleCreate"
          >
            <span v-if="creating" class="icon-[svg-spinners--3-dots-scale]"></span>
            <span v-else>{{ t('playlist.create_playlist') }}</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>