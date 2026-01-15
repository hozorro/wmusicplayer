import { type Ref, reactive, ref, shallowRef, watch, nextTick, computed, onMounted, onBeforeUnmount, onUnmounted } from "vue"
import { storeToRefs } from "pinia"
import { useMusicStore } from "@/store/music"
import { getTrackInfo, getStreamingUrl, favTrack, getLyric } from "@/apis/methods/music"
import { updateHits, updateArtistHitCount, getArtistsByIds, updateFav, getTrackHits } from '@/apis/methods/idb-locals'
import { usePlaySeq } from "@/composables/play-seq"
import useMediaSession from '@/composables/media-session';
import WMessage from "@/composables/message"
import { PlayChangeMode, SeqMode } from "@/constants/play-constants"
import { LyricParser } from "@/utilies/lyric-parser";

export function usePlayer(
  audioRef: Ref<HTMLAudioElement | null>, 
  lyricContainerRef: Ref<HTMLElement | null>, 
  switchCallback: () => void
){
  const store = useMusicStore()
  const { curPlaylist, curPlayIndex, playlistChanged } = storeToRefs(store)
  const {isLoop, isAutoPlayNext, timeUpdateInterval} = store.params
  const {
    seqOrder,
    seqList,
    seqIndex,
    initSeq,
    addSeqCur,
    addSeqNext,
    addSeqLast,
    replaceSeqList,
    addSeqListLast,
    nextSeqMode
  } = usePlaySeq()
  const track: TrackInfo = reactive({
    id: 0,
    title: '',
    artists: undefined,
    album: undefined,
    duration: 0,
    cover: '',
  })
  const playStatus = ref(false)
  const playInfo = reactive({
    playHitsChecked: false,
    playPortion: 0,
  })
  const lyricInfo = reactive({
    curLyricIndex: -1,
    curLyric: '',
    lyricLoading: false,
    lyricError: ''
  })
  const audioList = computed(() => curPlaylist.value)
  const lyric = shallowRef<LyricParser | null>(null)
  const lyrics = ref<LyricLine[]>([])
  const metadata = ref<ReturnType<LyricParser['getMetadata']>>({})
  const lyricLineRefs = ref<HTMLElement[]>([])
  const hitsInfo = ref<string[] | undefined>([])

  const consecutiveError = ref(0)

  const clearLineRefs = () => {
    lyricLineRefs.value = []
  }

  const setLyricLineRef = (el: HTMLElement | null, index: number) => {
    if(el) { 
      lyricLineRefs.value[index] = el
    }
  }

  const scrollToCurrent = () => {
    if(!lyricContainerRef.value || lyricInfo.curLyricIndex < 0) return;

    const targetLine = lyricLineRefs.value[lyricInfo.curLyricIndex]
    if(!targetLine) return;

    const containerRect = lyricContainerRef.value.getBoundingClientRect()
    const lineRect = targetLine.getBoundingClientRect()

    const containerTop = containerRect.top
    const containerBottom = containerRect.bottom
    const lineTop = lineRect.top
    const lineBottom = lineRect.bottom

    if(lineTop < containerTop || lineBottom > (containerTop + containerBottom) / 2) {
      targetLine.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }

  let timeUpdateFlag: NodeJS.Timeout | null
  /**
   * handle time update event
   * execute callback function after a specific interval, avoid repeated triggering
   * @param {Function} callback - callback function to be executed
   */
  function handleTimeUpdate(callback?: () => void){
    // check time update flag, avoid triggering repeatedly
    if(timeUpdateFlag) return
    // set a new timeout to execute the callback after the specified interval
    timeUpdateFlag = setTimeout(() => {
      if(audioRef.value){ 
        playInfo.playPortion = audioRef.value.currentTime / audioRef.value.duration
        if(callback) callback();
        if(playInfo.playPortion > store.getParam('stat_percent') / 100 && !playInfo.playHitsChecked){
          try{
            if (store.isIDBReady) {
              updateHits('track',track.id)  // only update at local
              if(track.artists) {
                for (const ar of track.artists) {
                  updateArtistHitCount(ar.id) // only update at local
                }
              }
            }
          }catch(err){
            WMessage('Fail to update hit.', 'error')
          }finally{
            playInfo.playHitsChecked = true
          }
        }

        if(lyric.value) {
          const index = lyric.value.getCurrentLyricIndex(audioRef.value.currentTime)
          if(index !== lyricInfo.curLyricIndex) {
            lyricInfo.curLyricIndex = index
            lyricInfo.curLyric = index === -1 ? '' : lyrics.value[index]?.text || ''

            nextTick(() => {
              scrollToCurrent()
            })
          }
        }
      }
      
      timeUpdateFlag = null
    }, timeUpdateInterval)
  }

  const _getLyric = async (track_id: number) => { 
    lyricInfo.lyricLoading = true
    let lyricContent = await getLyric(track_id)
    if(lyricContent){
      const lyricParser = new LyricParser(lyricContent)
      lyric.value = lyricParser
      lyrics.value = lyricParser.getLyrics()
      metadata.value = lyricParser.getMetadata()
      clearLineRefs()
    } else {
      lyricInfo.lyricError = 'Failed to load lyric.'
    }
    lyricInfo.lyricLoading = false
  }
  function loadHitsInfo(track_id: number) {
    if (hitsInfo.value && hitsInfo.value.length > 0) return;
    getTrackHits(track_id).then((data) => hitsInfo.value = data).catch(() => {hitsInfo.value = []})
  }
  function play(opts: {curTime?: number}={curTime: 0}){
    return new Promise((resolve, reject) => {
      let _handlePlay = () => {
        if(audioRef.value == undefined) return reject()
        audioRef.value.play().then(() => {
          nextTick(() => {
            if(opts.curTime){
              // play from specific time
              if(audioRef.value == undefined) return reject()
              audioRef.value.currentTime = opts.curTime
            }
            playStatus.value = true
            playInfo.playHitsChecked = false
            resolve(audioRef.value)
            consecutiveError.value = 0
          })
        }).catch(err => {
          WMessage(err, 'error')
          if(err.code == 9){
            consecutiveError.value += 1
            if(isAutoPlayNext && consecutiveError.value < store.getParam('max_fail_count')){
              // stop auto next when consecutive error times exceed 10
              setTimeout(() => {
                playNext()
              }, store.getParam('switch_time'))
              return
            }
            if(consecutiveError.value >= 10){
              consecutiveError.value = 0
            }
          }
          reject(err)
        })
      }
      _handlePlay()
    })
  }

  function pause(){
    if(audioRef.value){
      audioRef.value.pause()
      playStatus.value = false
    }
  }

  async function switchPlay(directChange=false){
    // only when click track in playbox playlist to switch play, directChange is true.
    if(!directChange){
      curPlayIndex.value = seqList.value[seqIndex.value]
    }
    let tid = curPlaylist.value[curPlayIndex.value].id
    const data = await getTrackInfo(tid)
    track.id = tid
    track.title = data.title
    track.artists = data.artists
    track.album = data.album
    track.duration = data.duration
    track.favorited_at = data.favorited_at
    track.cover = `/api/artwork/track/${tid}?v=${track.cover_art_hash || 'default'}`
    
    nextTick(() => { 
      if(audioRef.value && !isNaN(audioRef.value.currentTime)) {
        handleTimeUpdate()
      }
    })
    
    if(audioRef.value){
      pause()
    }
    if(audioRef.value !== null) {
      const streamUrl = await getStreamingUrl(tid)
      audioRef.value.src = `/api/${streamUrl}`
      _getLyric(tid)
      hitsInfo.value = undefined
    }
    play().then(() => switchCallback()).catch((err) =>{
      WMessage(err.message, 'error')
    })
  }

  function playAudio(){
    if(seqList.value.length == 0) return
    if(audioRef.value){
      if(playStatus.value){
        audioRef.value.pause()
        playStatus.value = false
      }else{
        audioRef.value.play()
        playStatus.value = true
        if (!lyric.value && track.id) {
          _getLyric(track.id)
        }
      }
    }
  }

  function playNext(){
    if(seqOrder.value == SeqMode.SINGLE_LOOP) return
    if(seqIndex.value + 1 >= seqList.value.length){
      if(isLoop){
        seqIndex.value = 0
      }else{
        return
      }
    }else{
      seqIndex.value += 1
    }
    switchPlay()
  }

  function playPrev(){
    if(seqOrder.value == SeqMode.SINGLE_LOOP) return
    if(seqIndex.value - 1 < 0){
      if(isLoop){
        seqIndex.value = seqList.value.length - 1
      }else{
        return
      }
    }else{
      seqIndex.value -= 1
    }
    switchPlay()
  }

  function playEnded(){
    setTimeout(() => {
      pause()
      if(isAutoPlayNext){
        if(seqOrder.value !== 2){
          playNext()
        }else(
          switchPlay()
        )
      }
    }, timeUpdateInterval)
  }

  function handleOrder(){
    nextSeqMode()
  }

  async function handleFav(){
    const favorited_at = await favTrack(curPlaylist.value[curPlayIndex.value].id, !track.favorited_at)
    track.favorited_at = favorited_at || ''
  }

  const artistsFavStatus = ref<'pending' | 'hasFav' | 'noneFav' | 'failed'>('pending')
  const artistsFavs = ref<Pick<IDBArtist, 'id' | 'name' | 'favorited_at'>[]>([])
  const artistsFavsShow = ref(false)
  async function fetchArtistsFavStatus(){ 
    artistsFavStatus.value = 'pending'
    try {
      const _artists = await getArtistsByIds(track.artists?.map(a => a.id) || [])
      artistsFavs.value = _artists
      artistsFavStatus.value = _artists.some(a => a.favorited_at) ? 'hasFav' : 'noneFav'
    } catch (err) {
      artistsFavStatus.value = 'failed'
    }
  }
  async function _switchArtistFav(artistId: number){ 
    try {
      if (store.isIDBReady) {
        await updateFav('artist', artistId)
        fetchArtistsFavStatus()
      }
    } catch (err) {
      WMessage('failed to fav artist', 'error')
    }
  }
  function handleArtistFavs(){
    if (artistsFavsShow.value) { 
      artistsFavsShow.value = false
      return
    }
    if (artistsFavs.value.length == 0) return
    if (artistsFavs.value.length == 1) _switchArtistFav(artistsFavs.value[0].id)
    else artistsFavsShow.value = true
  }
  function handleArtistFavSelected(artistId: number) {
    _switchArtistFav(artistId)
  }

  function playRemove(id: number){
    let removeIndex = curPlaylist.value.findIndex(item => item.id == id)
    curPlaylist.value.splice(removeIndex, 1)
    seqList.value.splice(seqList.value.indexOf(removeIndex), 1)
    seqList.value = seqList.value.map((number) => {
      if(number > removeIndex){
        return number - 1
      }else{
        return number
      }
    })
    if(curPlayIndex.value == removeIndex){
      playNext()
    }
  }

  function playlistItemClick(index: number, callback: () => void) {
    curPlayIndex.value = index
    seqIndex.value = seqList.value.indexOf(index)
    switchPlay(true)
    callback()
  }

  watch(playlistChanged, (newValue) => {
    if(seqList.value.length == 0){
      initSeq()
    }
    switch(newValue){
      case PlayChangeMode.ADD_CUR:  // add before the current playing file, and play immediately
        addSeqCur()
        switchPlay()
        break
      case PlayChangeMode.ADD_NEXT: // add after the current playing file
        addSeqNext()
        break
      case PlayChangeMode.ADD_LAST: // add after the current playing file, and play immediately
        addSeqLast()
        break
      case PlayChangeMode.REPLACE_LIST: // replace the current playing list
        replaceSeqList()
        switchPlay()
        break
      case PlayChangeMode.REPLACE_LIST_RND: // replace the current playing list, and play randomly
        seqOrder.value = SeqMode.LIST_RND
        replaceSeqList()
        switchPlay()
        break
      case PlayChangeMode.ADD_LIST_LAST:  // add the list to the end of the current playing list
        addSeqListLast()
        break
      case PlayChangeMode.DIRECT_PLAY:
        seqIndex.value = seqList.value.indexOf(curPlayIndex.value)
        switchPlay(true)
        break
      default:
        break
    }
    playlistChanged.value = PlayChangeMode.DONOTHING
  })

  onMounted(async () => {
    await nextTick(() => {
      audioRef.value?.load()
      if (audioRef.value) {
        useMediaSession(audioRef as Ref<HTMLAudioElement>, track, {
          play: playAudio,
          pause: pause,
          next: playNext,
          previous: playPrev
        })
      }
      
      if(curPlaylist.value.length > 0){
        const tid = curPlaylist.value[curPlayIndex.value].id
        const req = getTrackInfo(tid)
        req.then(data => {
          track.id = tid
          track.title = data.title
          track.artists = data.artists
          track.album = data.album
          track.duration = data.duration
          track.favorited_at = data.favorited_at
          track.cover = `/api/artwork/track/${tid}`
        })
        getStreamingUrl(tid).then(streamUrl => {
          if (audioRef.value) audioRef.value.src = `/api/${streamUrl}`
        })
      }
    })
  })
  onBeforeUnmount(() => {
    pause()
  })
  onUnmounted(() => {
    if(audioRef.value){
      audioRef.value.pause()
      audioRef.value.removeAttribute('src')
    }
  })

  return {
    track,
    hitsInfo,
    loadHitsInfo,
    lyric,
    lyrics,
    metadata,
    playStatus,
    playInfo,
    lyricInfo,
    lyricLineRefs,
    setLyricLineRef,
    audioList,
    seqOrder,
    switchPlay,
    handleTimeUpdate,
    playAudio,
    playNext,
    playPrev,
    playEnded,
    playRemove,
    handleOrder,
    handleFav,
    artistsFavStatus,
    artistsFavs,
    artistsFavsShow,
    fetchArtistsFavStatus,
    handleArtistFavs,
    handleArtistFavSelected,
    playlistItemClick
  }
}