import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMusicStore, useOperationStore } from '@/store/music'
import { starTrack, getTrackInfo } from '@/apis/methods/music'
import { PlayChangeMode } from '@/constants/play-constants'

export default function useTrackOperations (callback?: () => void) {
  const router = useRouter()
  const musicStore = useMusicStore()
  const operationStore = useOperationStore()

  function handleClick(track: Track) {
    let index = musicStore.curPlaylist.findIndex(item => item.id === track.id)
    if (index === -1) musicStore.addToCurPlaylist(track, PlayChangeMode.ADD_CUR)
    else { 
      musicStore.curPlayIndex = index
      musicStore.playlistChanged = PlayChangeMode.DIRECT_PLAY
    }
    if (callback) callback()
  }

  function handleOperation(id: string, title: string) {
    operationStore.openPopMenu(id, title, operations.value)
    if (callback) callback()
  }

  const operations = computed<Operation[]>(() => [
    { label: '添加并播放', action: handleInsertPlay },
    { label: '添加到下一首', action: handleInsertNext },
    { label: '添加到播放列表', action: handleAddLast },
    { label: '添加到歌单', action: handleAddToPlaylist },
    { label: '添加到Fav', action: handleAddToFavorite },
  ])

  function handleInsertPlay() {
    musicStore.addToCurPlaylist({id: operationStore.popMenuId as string, title: operationStore.popMenuTitle}, PlayChangeMode.ADD_CUR)
    operationStore.closePopMenu()
    if(callback) callback()
  }

  function handleInsertNext() {
    musicStore.addToCurPlaylist({id: operationStore.popMenuId as string, title: operationStore.popMenuTitle}, PlayChangeMode.ADD_NEXT)
    operationStore.closePopMenu()
    if(callback) callback()
  }

  function handleAddLast() {
    musicStore.addToCurPlaylist({id: operationStore.popMenuId as string, title: operationStore.popMenuTitle}, PlayChangeMode.ADD_LAST)
    operationStore.closePopMenu()
    if(callback) callback()
  }

  function handleAddToFavorite() {
    starTrack(operationStore.popMenuId as string, true).then(data => { 
      if(data) alert('成功添加到Fav')
    })
    operationStore.closePopMenu()
    if(callback) callback()
  }

  // current playing list operations
  const curPlaylistOperations = computed<Operation[]>(() => [
    {'label': '添加到歌单', 'action': handleAddToPlaylist},
    {'label': '查看所属专辑', 'action': handleGoToAlbum}
  ])

  function handleCurPlaylistOperation(id: string, title: string) { 
    operationStore.openPopMenu(id, title, curPlaylistOperations.value)
    if (callback) callback()
  }

  function handleGoToAlbum() { 
    getTrackInfo(operationStore.popMenuId as string).then(data => { 
      router.push({name: 'album', params: {id: data.album_id}})
    })
    operationStore.closePopMenu()
  }
  function handleAddToPlaylist() { 
    operationStore.closePopMenu()
    operationStore.openAddToPlaylistMenu(operationStore.popMenuId as string, operationStore.popMenuTitle, operationStore.addToPlaylistOperations)
  }

  return {
    operations,
    curPlaylistOperations,
    handleClick,
    handleOperation,
    handleCurPlaylistOperation
  }
}