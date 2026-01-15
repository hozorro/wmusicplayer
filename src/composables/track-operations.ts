import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMusicStore, useOperationStore } from '@/store/music'
import { favTrack, getTrackInfo } from '@/apis/methods/music'
import { PlayChangeMode } from '@/constants/play-constants'
import WMessage from '@/composables/message'
import { openDialog } from './wdialog'
import { t } from '@/utilies/use-i18n'
import TrackMoreInfo from '@/views/dialogs/TrackMoreInfo.vue'

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
    { label: t('player.add_and_play'), icon: 'icon-[solar--play-circle-linear]', action: handleInsertPlay },
    { label: t('player.add_next'), icon: 'icon-[solar--rewind-forward-circle-linear]', action: handleInsertNext },
    { label: t('player.add_to_playinglist'), icon: 'icon-[solar--plaaylist-minimalistic-linear]', action: handleAddLast },
    { label: t('player.add_to_playlist'), icon: 'icon-[solar--playlist-minimalistic-3-linear]', action: handleAddToPlaylist },
    { label: t('player.add_to_favorite'), icon: 'icon-[solar--list-heart-minimalistic-linear]', action: handleAddToFavorite },
    { label: t('player.more_track_info'), icon: 'icon-[solar--translation-broken]', action: handleGetMoreInfo},
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
      if(data) WMessage(t('player.favorited_success'), 'success')
    })
    operationStore.closePopMenu()
    if(callback) callback()
  }
  async function handleGetMoreInfo() { 
    openDialog(TrackMoreInfo, {title: t('player.more_track_info'), contentProps: {trackId: operationStore.popMenuId as number}})
    operationStore.closePopMenu()
  }

  // current playing list operations
  const curPlaylistOperations = computed<Operation[]>(() => [
    {label: t('player.add_to_playlist'), icon: 'icon-[solar--playlist-minimalistic-3-linear]', action: handleAddToPlaylist},
    {label: t('player.to_album'), icon: 'icon-[solar--round-graph-linear]', action: handleGoToAlbum},
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