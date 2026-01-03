import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMusicStore, useOperationStore } from '@/store/music'
import { favTrack, getTrackInfo } from '@/apis/methods/music'
import { PlayChangeMode } from '@/constants/play-constants'
import WMessage from '@/composables/message'

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

  function handleOperation(id: number, title: string) {
    operationStore.openPopMenu(id, title, 'track', operations.value)
    if (callback) callback()
  }

  const operations = computed<Operation[]>(() => [
    { label: '添加并播放', icon: 'icon-[solar--play-circle-linear]', action: handleInsertPlay },
    { label: '添加到下一首', icon: 'icon-[solar--rewind-forward-circle-linear]', action: handleInsertNext },
    { label: '添加到播放列表', icon: 'icon-[solar--plaaylist-minimalistic-linear]', action: handleAddLast },
    { label: '添加到歌单', icon: 'icon-[solar--playlist-minimalistic-3-linear]', action: handleAddToPlaylist },
    { label: '添加到Fav', icon: 'icon-[solar--list-heart-minimalistic-linear]', action: handleAddToFavorite },
  ])

  function handleInsertPlay() {
    musicStore.addToCurPlaylist({id: operationStore.popMenuId as number, title: operationStore.popMenuTitle}, PlayChangeMode.ADD_CUR)
    operationStore.closePopMenu()
    if(callback) callback()
  }

  function handleInsertNext() {
    musicStore.addToCurPlaylist({id: operationStore.popMenuId as number, title: operationStore.popMenuTitle}, PlayChangeMode.ADD_NEXT)
    operationStore.closePopMenu()
    if(callback) callback()
  }

  function handleAddLast() {
    musicStore.addToCurPlaylist({id: operationStore.popMenuId as number, title: operationStore.popMenuTitle}, PlayChangeMode.ADD_LAST)
    operationStore.closePopMenu()
    if(callback) callback()
  }

  function handleAddToFavorite() {
    favTrack(operationStore.popMenuId as number, true).then(data => { 
      if(data) WMessage('收藏成功', 'success')
    })
    operationStore.closePopMenu()
    if(callback) callback()
  }

  // current playing list operations
  const curPlaylistOperations = computed<Operation[]>(() => [
    {label: '添加到歌单', icon: 'icon-[solar--playlist-minimalistic-3-linear]', action: handleAddToPlaylist},
    {label: '查看所属专辑', icon: 'icon-[solar--round-graph-linear]', action: handleGoToAlbum}
  ])

  function handleCurPlaylistOperation(id: number, title: string) { 
    operationStore.openPopMenu(id, title, 'track', curPlaylistOperations.value)
    if (callback) callback()
  }

  function handleGoToAlbum() { 
    getTrackInfo(operationStore.popMenuId as number).then(data => { 
      router.push({name: 'album', params: {id: data.album?.id}})
    })
    operationStore.closePopMenu()
  }
  function handleAddToPlaylist() { 
    operationStore.closePopMenu()
    operationStore.openAddToPlaylistMenu(operationStore.popMenuId as number, operationStore.popMenuTitle, operationStore.addToPlaylistOperations)
  }

  return {
    operations,
    curPlaylistOperations,
    handleClick,
    handleOperation,
    handleCurPlaylistOperation
  }
}