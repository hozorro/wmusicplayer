import { ref } from "vue";
import { defineStore } from "pinia";
import { PlayChangeMode } from "@/constants/play-constants";
import { indexedDbHelper } from "@/apis/idb-funcs";
import idbConfig from "@/apis/idb-config";
import { loadLocaleMessages } from "@/i18n";

export const useMusicStore = defineStore("music", () => {
  const locale =  ref<SupportedLocale>((localStorage.getItem('locale') || 'zh-CN') as SupportedLocale)
  const isDark = ref(false)
  const playerBoxShow = ref(true)
  const curPlaylist = ref<Track[]>([])
  const curPlayIndex = ref(0)
  const playlistChanged = ref<PlayChangeMode>(PlayChangeMode.DONOTHING)
  const idbHelper = ref(new indexedDbHelper(idbConfig))
  const isIDBReady = ref(false)
  const params = ref<PlayerOptions>({
    stat_percent: 30,
    switch_time: 500,
    max_fail_count: 10,
    isLoop: true,
    isAutoPlayNext: true,
    timeUpdateInterval: 500,
    transferBatchSize: 500,
  })
  async function setLocale(newLocale: SupportedLocale) {
    if (locale.value === newLocale) return
    await loadLocaleMessages(newLocale)
    locale.value = newLocale
  }
  function addToCurPlaylist(track: Track, addMode: PlayChangeMode) { 
    switch (addMode) {
      case PlayChangeMode.ADD_CUR:
        curPlaylist.value.splice(curPlayIndex.value, 0, track)
        break
      case PlayChangeMode.ADD_NEXT:
        curPlaylist.value.splice(curPlayIndex.value + 1, 0, track)
        break
      case PlayChangeMode.ADD_LAST:
        curPlaylist.value.push(track)
        break
      default:
        break
    }
    playlistChanged.value = addMode
  }
  function addListToCurPlaylist(trackList: Track[], addMode: PlayChangeMode) {
    if (addMode === PlayChangeMode.REPLACE_LIST) curPlaylist.value = [...trackList]
    else if (addMode === PlayChangeMode.ADD_LIST_LAST) curPlaylist.value.push(...trackList)
    playlistChanged.value = addMode
  }
  function getParam<K extends keyof PlayerOptions>(key:K):PlayerOptions[K]{
    return params.value[key]
  }
  function setParam<K extends keyof PlayerOptions>(key:K, value:PlayerOptions[K]):void{
    params.value[key] = value
  }
  return { 
    locale,
    isDark,
    playerBoxShow,
    curPlaylist,
    curPlayIndex,
    playlistChanged,
    idbHelper,
    isIDBReady,
    params,
    setLocale,
    addToCurPlaylist,
    addListToCurPlaylist,
    getParam,
    setParam
  }
}, {
  persist: {
    pick:['locale', 'isDark', 'params', 'curPlaylist', 'curPlayIndex']
  }
})

export const useOperationStore = defineStore("operation", () => {
  const popMenuOperations = ref<Operation[]>([])
  const popMenuId = ref<number>(0)
  const popMenuTitle = ref('')
  const popMenuType = ref<PopType>('track')
  const popMenuShow = ref(false)

  const addToPlaylistOperations = ref<Operation[]>([])
  const addToPlaylistId = ref<number>(0)
  const addToPlaylistTitle = ref('')
  const addToPlaylistShow = ref(false)

  function setPopMenu(id: number, title: string, popType: PopType, Operations: Operation[]) { 
    popMenuId.value = id
    popMenuTitle.value = title
    popMenuType.value = popType
    popMenuOperations.value = Operations
    popMenuShow.value = true
  }
  function setAddToPlaylistMenu(id: number, title: string, Operations: Operation[]) {
    addToPlaylistId.value = id
    addToPlaylistTitle.value = title
    addToPlaylistOperations.value = Operations
    addToPlaylistShow.value = true
  }
  function openPopMenu(id: number, title: string, popType: PopType, Operations: Operation[]) { 
    setPopMenu(id, title, popType, Operations)
    popMenuShow.value = true
  }
  function closePopMenu() {
    popMenuShow.value = false
  }
  function openAddToPlaylistMenu(id: number, title: string, Operations: Operation[]) {
    popMenuShow.value = false
    setAddToPlaylistMenu(id, title, Operations)
    addToPlaylistShow.value = true
  }
  function closeAddToPlaylistMenu() {
    addToPlaylistShow.value = false
    popMenuShow.value = true
  }

  return {
    popMenuOperations,
    popMenuId,
    popMenuTitle,
    popMenuType,
    addToPlaylistOperations,
    addToPlaylistId,
    addToPlaylistTitle,
    popMenuShow,
    addToPlaylistShow,
    openPopMenu,
    closePopMenu,
    openAddToPlaylistMenu,
    closeAddToPlaylistMenu
  }
})