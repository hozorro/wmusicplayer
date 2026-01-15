import { computed } from 'vue'
import { useMusicStore, useOperationStore } from '@/store/music'
import { getCollectionTracks } from '@/apis/methods/music'
import { PlayChangeMode } from '@/constants/play-constants'
import { t } from '@/utilies/use-i18n'

export default function useCollectionOperations (colType: Exclude<PopType, 'track'>, callback?: () => void) { 
  const musicStore = useMusicStore()
  const operationStore = useOperationStore()

  function handleOperation(id: number, name: string) { 
    operationStore.openPopMenu(id, name, colType, operations.value)
    if (callback) callback()
  }

  const operations = computed<Operation[]>(() => [
    { label: t('player.playall'), icon: 'icon-[solar--play-circle-linear]', action: handlePlayAll },
    { label: t('player.add_to_playinglist'), icon: 'icon-[solar--plaaylist-minimalistic-linear]', action: handleAddToCurPlaylist },
  ])

  function handlePlayAll() { 
    getCollectionTracks(operationStore.popMenuId, colType).then((data) => {
      musicStore.addListToCurPlaylist(data, PlayChangeMode.REPLACE_LIST)
    })
    operationStore.popMenuShow = false
    if(callback) callback()
  }

  function handleAddToCurPlaylist() { 
    getCollectionTracks(operationStore.popMenuId, colType).then((data) => {
      musicStore.addListToCurPlaylist(data, PlayChangeMode.ADD_LIST_LAST)
    })
    operationStore.popMenuShow = false
    if(callback) callback()
  }

  return { 
    operations,
    handleOperation
  }
}