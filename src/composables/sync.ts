import { reactive } from 'vue'
import type { Ref } from 'vue'
import { useMusicStore } from '@/store/music'
import { 
  getDbMetaInfo, getMusicUnsyncedCount, getHitsCount,
  transferTracks, transferFolders, transferAlbums, transferArtists, transferGenres,
  uploadHits, uploadFavs, uploadPlaylistLists, downloadPlaylistLists,
  downloadHitsList, downloadArtistHitsCountList, downloadFavs
} from '@/apis/methods/transfer'
import { getFavs, getHits, getTotalHitsCount, getPlaylists } from '@/apis/methods/idb-locals'

interface SyncInfo {
  countServer: number
  versionServer: string
  countLocal: number
  versionLocal: string
  syncing?: boolean
  syncProgress?: number
}
type ModelInfoDict = {
  [key in MusicEntity]: SyncInfo
}
type PlaybackInfoDict = { 
  [key in PlaybackEntity]: SyncInfo
}
const initialInfo: SyncInfo = {
  countServer: 0,
  versionServer: '',
  countLocal: 0,
  versionLocal: '',
  syncing: false,
}
const progressInitialInfo: SyncInfo = {
  ...initialInfo,
  syncProgress: 0
}
const transferMethods = {
  'track': transferTracks,
  'folder': transferFolders,
  'album': transferAlbums,
  'artist': transferArtists,
  'genre': transferGenres
}

export function useSync(optInfo: Ref<string>) { 
  const musicSyncInfos = reactive<ModelInfoDict>({
    folder: {...progressInitialInfo},
    track: {...progressInitialInfo},
    artist: {...progressInitialInfo},
    album: {...progressInitialInfo},
    genre: {...progressInitialInfo},
  })
  const playbackSyncInfos = reactive<PlaybackInfoDict>({
    trackhit: {...progressInitialInfo},
    playlisthit: {...progressInitialInfo},
    trackfav: {...initialInfo},
    artistfav: {...initialInfo},
    playlist: {...initialInfo},
  })
  const { idbHelper, getParam } = useMusicStore()
  const transferBatchSize = getParam('transferBatchSize')

  const initialLocalDbPlaybackMetaInfo = async () => { 
    for (let model of ['trackhit', 'playlisthit', 'trackfav', 'artistfav', 'playlist']) { 
      await idbHelper.update('meta', model, {name: model, total_count: 0, last_update: '2000-01-01T00:00:00.000Z'}, true)
    }
  }
  const refreshLocalDbPlaybackMetaInfo = async () => { 
    // 1. hit count
    for (let model of ['track', 'playlist']) { 
      const hitCount = await getTotalHitsCount(model as 'track' | 'playlist')
      await idbHelper.update('meta', `${model}hit`, {name: `${model}hit`, total_count: hitCount}, true)
    }
    // 2. fav count
    for (let model of ['track', 'artist']) { 
      const favs = await getFavs(model as 'track' | 'artist')
      await idbHelper.update('meta', `${model}fav`, {name: `${model}fav`, total_count: favs.length}, true)
    }
    // 3. playlist count
    const playlists = await getPlaylists()
    await idbHelper.update('meta', 'playlist', {name: 'playlist', total_count: playlists.length}, true)
  }

  async function getLocalDbMetaInfo() {
    const metaList = await idbHelper.getAll<IMeta<MetaType>>('meta')
    for (let meta of metaList) {
      if (['folder', 'track', 'artist', 'album', 'genre'].includes(meta.name)) {
        musicSyncInfos[meta.name as MusicEntity].countLocal = meta.total_count
        musicSyncInfos[meta.name as MusicEntity].versionLocal = meta.last_update
      } else {
        playbackSyncInfos[meta.name as PlaybackEntity].countLocal = meta.total_count
        playbackSyncInfos[meta.name as PlaybackEntity].versionLocal = meta.last_update
      }
    }
  }
  async function getServerDbMetaInfo() {
    const res = await getDbMetaInfo()
    if(res) {
      for (let meta of res) {
        if (['folder', 'track', 'artist', 'album', 'genre'].includes(meta.model_name)) {
          musicSyncInfos[meta.model_name as MusicEntity].countServer = meta.total_count
          musicSyncInfos[meta.model_name as MusicEntity].versionServer = meta.last_update
        } else {
          playbackSyncInfos[meta.model_name as PlaybackEntity].countServer = meta.total_count
          playbackSyncInfos[meta.model_name as PlaybackEntity].versionServer = meta.last_update
        }
      }
    }
  }

  const _getMusicToBeTranferredCount = async (model: MusicEntity, incremental?: boolean) => { 
    let last_sync = '2000-01-01T00:00:00.000Z'
    let total_count = 0
    let local_count = 0
    if (incremental) {
      const metaInfo = await idbHelper.get<IMeta<MusicEntity>>('meta', model)
      if (metaInfo) {
        last_sync = metaInfo.last_update || '2000-01-01T00:00:00.000Z'
        local_count = metaInfo.total_count || 0
        total_count = await getMusicUnsyncedCount(model, last_sync)
      }
    } else {
      total_count = await getMusicUnsyncedCount(model)
    }
    return {total_count, last_sync, local_count}
  }
  const _initializeTrackPlaybackData = (track: IDBTrack) => { 
    track.hits = []
    track.hit_count = 0
    track.favorited_at = ''
  }
  const _initializeArtistPlaybackData = (artist: IDBArtist) => { 
    artist.hit_count = 0
    artist.favorited_at = ''
  }
  const _initializePlaylistPlaybackData = (playlist: IDBPlaylist[]) => { 
    for (let i = 0; i < playlist.length; i++) { 
      playlist[i].hits = []
      playlist[i].hit_count = 0
    }
  }
  async function syncMusicEntityData<T extends IDBModel>(model: MusicEntity, incremental?: boolean) { 
    optInfo.value += `\nBegin to sync ${model}...`
    // 1. get transfer info: local_count and last_sync is from local db meta, total_count is from server db meta.
    let {total_count, last_sync, local_count} = await _getMusicToBeTranferredCount(model, incremental)
    musicSyncInfos[model].syncing = true
    if (!incremental) {
      await idbHelper.clear(model)
      local_count = 0
    }
    const totalBatches = Math.ceil(total_count / transferBatchSize)
    let delCount = 0
    let upsertCount = 0
    // 2. transfer data with batches
    for (let i = 0; i < totalBatches; i++) { 
      let options: TransferOptions = { page_num: i + 1, page_size: transferBatchSize }
      if (last_sync) {
        options.last_sync = last_sync
      }
      // 2.1 get transfer data from server
      const transData: T[] = await transferMethods[model](options) as T[]
      // 2.2 divide data into delete and upsert according to the is_deleted flag
      const dataDel: number[] = []
      const dataUpsert: T[] = []
      for (let item of transData) {
        if (item.is_deleted) {
          dataDel.push(item.id)
        } else {
          dataUpsert.push(item)
        }
      }
      dataUpsert.map(item => {  // delete the is_deleted flag, which is not needed in idb
        if (model === 'track') {
          const {is_deleted, ...minus_item} = item
          return minus_item
        }
        return item
      })
      // 2.3 delete the divided dataDel(if incremental) or clear all local data
      if (!incremental) {
        // not incremental, all all data rebuild
        
        // reset playback data when not incremental(rebuild all data)
        if (model === 'track'){
          dataUpsert.forEach(item => _initializeTrackPlaybackData(item as IDBTrack))
        } else if (model === 'artist') {
          dataUpsert.forEach(item => _initializeArtistPlaybackData(item as IDBArtist))
        }
      } else {
        // incremental, delete the divided dataDel
        await idbHelper.deleteMany(model, dataDel)
        delCount += dataDel.length
        local_count -= dataDel.length
      }
      // 2.4 upsert the divided dataUpsert
      await idbHelper.upsertMany(model, dataUpsert)
      upsertCount += dataUpsert.length
      local_count += dataUpsert.length
      // 2.5 update sync progress
      musicSyncInfos[model].syncProgress = Math.round((i + 1) / totalBatches * 100)
    }
    // 2.6 update sync info and local meta data
    musicSyncInfos[model].syncing = false
    musicSyncInfos[model].countLocal = local_count
    last_sync = (new Date()).toISOString()
    musicSyncInfos[model].versionLocal = last_sync
    await idbHelper.update('meta', model, {name: model, total_count: local_count, last_update: last_sync}, true)
    optInfo.value += `\nSync ${model} complete: deleted: ${delCount}, upsert: ${upsertCount}, total: ${total_count}`
  }
  async function syncAllMusicEntityData() { 
    await syncMusicEntityData<IDBFolder>('folder')
    await syncMusicEntityData<IDBTrack>('track')
    await syncMusicEntityData<IDBArtist>('artist')
    await syncMusicEntityData<IDBAlbum>('album')
    await syncMusicEntityData<IDBGenre>('genre')
  }

  async function uploadTrackHitData() {
    const data = await getHits('track')
    const uploadData = data.reduce<{id: number, played_ats: string[]}[]>((acc, cur) => { 
    let hits = cur.hits.filter(item => item > playbackSyncInfos['trackhit'].versionLocal)
    if(hits.length > 0) { 
      acc.push({id: cur.id, played_ats: hits})
    }
    return acc
    },[])
    if(uploadData.length > 0) { 
      await uploadHits('track', uploadData)
    }
  }
  async function uploadPlaylistHitData() {
    const data = await getHits('playlist')
    const uploadData = data.reduce<{id: number, played_ats: string[]}[]>((acc, cur) => { 
    let hits = cur.hits.filter(item => item > playbackSyncInfos['playlisthit'].versionLocal)
    if(hits.length > 0) { 
      acc.push({id: cur.id, played_ats: hits})
    }
    return acc
    },[])
    if (uploadData.length > 0) { 
      await uploadHits('playlist', uploadData)
    }
  }
  const _refreshHitsMeta = async (model: 'track' | 'playlist', playback: 'trackhit' | 'playlisthit') => { 
    const hitData = await getHits(model)
    const result = hitData.reduce<MetaDict>((acc, cur) => { 
      acc['total_count'] += cur.hits.length
      let latest_hit = cur.hits.reduce((a, c) => a > c ? a : c)
      if (latest_hit > acc['last_update']) {
        acc['last_update'] = latest_hit
      }
      return acc
    }, {total_count: 0, last_update: ''})
    await idbHelper.update('meta', playback, {...result}, true)
    playbackSyncInfos[playback].versionLocal = result.last_update
    playbackSyncInfos[playback].countLocal = result.total_count
  }
  const _refreshFavMeta = async (model: 'track' | 'artist', playback: 'trackfav' | 'artistfav') => { 
    const favData = await getFavs(model)
    const result = favData.reduce<MetaDict>((acc, cur) => { 
      acc['total_count'] += 1
      let latest_fav = cur.favorited_at
      if (latest_fav > acc['last_update']) {
        acc['last_update'] = latest_fav
      }
      return acc
    }, {total_count: 0, last_update: ''})
    await idbHelper.update('meta', playback, {...result}, true)
    playbackSyncInfos[playback].versionLocal = result.last_update
    playbackSyncInfos[playback].countLocal = result.total_count
  }
  async function syncFavData(model: 'track' | 'artist') { 
    const favsServer = new Set(await downloadFavs(model))
    const favsLocal = new Set(await getFavs(model))
    // 1. upload favs to server
    const added = [...favsLocal].filter(item => !favsServer.has(item))    // exists in local, not exists in server
    const removed = [...favsServer].filter(item => !favsLocal.has(item))  // exists in server, not exists in local
    const res = await uploadFavs(model, {added, removed})
    if(res) optInfo.value += `\nUpload ${model} favs complete: added: ${added.length}, removed: ${removed.length}`
    // 2. deal with favs of local
    const added_local = [...favsServer].filter(item => !favsLocal.has(item))    // exists in server, not exists in local
    const removed_local = [...favsLocal].filter(item => !favsServer.has(item))  // exists in local, not exists in server
    for (let item of added_local) { 
      await idbHelper.update(model, item.id, {favorited_at: item.favorited_at})
    }
    for (let item of removed_local) { 
      await idbHelper.update(model, item.id, {favorited_at: ''})
    }
    await _refreshFavMeta(model, `${model}fav`)
    optInfo.value += `\nLocal ${model} favs treatment complete: added: ${added_local.length}, removed: ${removed_local.length}`
  }

  
  async function downloadTrackHitData() { 
    const total_count = await getHitsCount('track')
    const totalBatches = Math.ceil(total_count / transferBatchSize)
    for (let i = 0; i < totalBatches; i++) { 
      const options: TransferOptions = { page_num: i + 1, page_size: transferBatchSize }
      const data = await downloadHitsList('track', options)
      for (let item of data) { 
        await idbHelper.update('track', item.id, {hits: item.played_ats})
      }
    }
    await _refreshHitsMeta('track', 'trackhit')
  }
  async function downloadArtistHitData() {
    const total_count = await getHitsCount('artist')
    const totalBatches = Math.ceil(total_count / transferBatchSize)
    for (let i = 0; i < totalBatches; i++) { 
      const options: TransferOptions = { page_num: i + 1, page_size: transferBatchSize }
      const data = await downloadArtistHitsCountList(options) // hit_count list
      for (let item of data) { 
        await idbHelper.update('artist', item.artist_id, {hit_count: item.hit_count})
      }
    }
  }
  async function downloadPlaylistHitData() {
    const total_count = await getHitsCount('playlist')
    const totalBatches = Math.ceil(total_count / transferBatchSize)
    for (let i = 0; i < totalBatches; i++) { 
      const options: TransferOptions = { page_num: i + 1, page_size: transferBatchSize }
      const data = await downloadHitsList('playlist',options)
      for (let item of data) { 
        await idbHelper.update('playlist', item.id, {hits: item.played_ats})
      }
    }
    await _refreshHitsMeta('playlist', 'playlisthit')
  }
  async function uploadPlaylists() {
    const data = await getPlaylists()
    const upData = data.reduce<IDBPlaylist[]>((acc, cur) => { 
      if (cur.updated_at === undefined) return acc
      if (cur.updated_at > playbackSyncInfos['playlist'].versionLocal) {
        acc.push({
          id: cur.id,
          title: cur.title,
          comment: cur.comment,
          is_deleted: cur.is_deleted,
          track_ids: cur.track_ids
        })
      }
      return acc
    }, [])
    const res = await uploadPlaylistLists(upData)
    if(res) optInfo.value += `\nUpload playlists complete: ${res.total}, updated: ${res.updated}, created: ${res.created}`
  }
  async function downloadPlaylists() {
    const data = await downloadPlaylistLists()
    if (data) {
      _initializePlaylistPlaybackData(data)
      await idbHelper.clear('playlist')
      await idbHelper.addMany('playlist', data)
      const last_update = new Date().toISOString()
      await idbHelper.update('meta', 'playlist', {total_count: data.length, last_update})
      playbackSyncInfos.playlist.versionLocal = last_update
      playbackSyncInfos.playlist.countLocal = data.length
    }
  }

  return {
    musicSyncInfos,
    playbackSyncInfos,
    initialLocalDbPlaybackMetaInfo,
    refreshLocalDbPlaybackMetaInfo,
    getLocalDbMetaInfo,
    getServerDbMetaInfo,
    syncMusicEntityData,
    syncAllMusicEntityData,
    uploadTrackHitData,
    uploadPlaylistHitData,
    syncFavData,
    downloadTrackHitData,
    downloadArtistHitData,
    downloadPlaylistHitData,
    uploadPlaylists,
    downloadPlaylists
  }
}