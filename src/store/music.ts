import { ref } from "vue";
import { defineStore } from "pinia";
import { PlayChangeMode } from "@/constants/play-constants";

export const useMusicStore = defineStore("music", () => {
  const playerBoxShow = ref(true)
  const curPlaylist = ref<Track[]>([])
  const curPlayIndex = ref(0)
  const playlistChanged = ref<PlayChangeMode>(PlayChangeMode.DONOTHING)
  const params = ref<PlayerOptions>({
    stat_percent: 30,
    switch_time: 500,
    max_fail_count: 10,
    isLoop: true,
    isAutoPlayNext: true,
    timeUpdateInterval: 500
  })

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
    playerBoxShow,
    curPlaylist,
    curPlayIndex,
    playlistChanged,
    params,
    addToCurPlaylist,
    addListToCurPlaylist,
    getParam,
    setParam
  }
})

export const useOperationStore = defineStore("operation", () => {
  const popMenuOperations = ref<Operation[]>([])
  const popMenuId = ref<string|number>('')
  const popMenuTitle = ref('')
  const popMenuShow = ref(false)

  const addToPlaylistOperations = ref<Operation[]>([])
  const addToPlaylistId = ref<string>('')
  const addToPlaylistTitle = ref('')
  const addToPlaylistShow = ref(false)

  function setPopMenu(id: string|number, title: string, Operations: Operation[]) { 
    popMenuId.value = id
    popMenuTitle.value = title
    popMenuOperations.value = Operations
    popMenuShow.value = true
  }
  function setAddToPlaylistMenu(id: string, title: string, Operations: Operation[]) {
    addToPlaylistId.value = id
    addToPlaylistTitle.value = title
    addToPlaylistOperations.value = Operations
    addToPlaylistShow.value = true
  }
  function openPopMenu(id: string|number, title: string, Operations: Operation[]) { 
    setPopMenu(id, title, Operations)
    popMenuShow.value = true
  }
  function closePopMenu() {
    popMenuShow.value = false
  }
  function openAddToPlaylistMenu(id: string, title: string, Operations: Operation[]) {
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