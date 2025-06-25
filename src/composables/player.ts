import { type Ref, reactive, ref, watch, nextTick, computed, onMounted, onBeforeUnmount, onUnmounted } from "vue"
import { storeToRefs } from "pinia"
import { useMusicStore } from "@/store/music"
import { getTrackInfo, starTrack } from "@/apis/methods/music"
import { usePlaySeq } from "@/composables/play-seq"
import useMediaSession from '@/composables/media-session';
import { PlayChangeMode, SeqMode } from "@/constants/play-constants"

const baseSrcURL = import.meta.env.VITE_BASE_SRC_URL;

export function usePlayer(audioRef: Ref<HTMLAudioElement | null>, switchCallback: () => void){
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
    id: '',
    title: '',
    artists: [],
    album: '',
    duration: 0,
    cover: '',
    starred: false,
  })
  const playStatus = ref(false)
  const playInfo = reactive({
    playHitsChecked: false
  })
  const audioList = computed(() => curPlaylist.value)

  const consecutiveError = ref(0)

  let timeUpdateFlag: NodeJS.Timeout | null
  /**
   * 处理时间更新事件
   * 此函数用于在特定间隔后执行回调函数，期间避免重复触发
   * @param {Function} callback - 时间更新后的回调函数
   */
  function handleTimeUpdate(callback: () => void){
    // 检查时间更新标志，避免在间隔内重复触发
    if(timeUpdateFlag) return
    // 设置一个新的setTimeout调用，确保在指定间隔后执行回调
    timeUpdateFlag = setTimeout(() => {
      callback()
      timeUpdateFlag = null
    }, timeUpdateInterval)
  }

  function play(opts: {curTime?: number}={curTime: 0}){
    return new Promise((resolve, reject) => {
      let handlePlay = () => {
        if(audioRef.value == undefined) return reject()
        audioRef.value.play().then(() => {
          nextTick(() => {
            if(opts.curTime){
              // 播放到指定时间
              if(audioRef.value == undefined) return reject()
              audioRef.value.currentTime = opts.curTime
            }
            playStatus.value = true
            playInfo.playHitsChecked = false
            resolve(audioRef.value)
            consecutiveError.value = 0
          })
        }).catch(err => {
          if(err.code == 9){
            consecutiveError.value += 1
            if(isAutoPlayNext && consecutiveError.value < store.getParam('max_fail_count')){// 连续错误次数超过10次，则停止自动播放下一首
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
      handlePlay()
    })
  }

  function pause(){
    if(audioRef.value){
      audioRef.value.pause()
      playStatus.value = false
    }
  }

  function switchPlay(directChange=false){
    // only when click track in playbox playlist to switch play, directChange is true.
    if(!directChange){
      curPlayIndex.value = seqList.value[seqIndex.value]
    }
    let tid = curPlaylist.value[curPlayIndex.value].id
    getTrackInfo(tid).then(data => {
      track.id = tid
      track.title = data.title
      track.artists = data.artists
      track.album = data.album
      track.duration = data.duration
      track.starred = data.starred
      track.cover = baseSrcURL + 'getcover?size=500&id=' + tid
    })
    if(audioRef.value){
      pause()
    }
    if(audioRef.value !== null) audioRef.value.src = baseSrcURL + 'stream?id=' + tid
    play().then(() => switchCallback()).catch((err) =>{
      alert(err.message)
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

  function handleStar(starred: boolean, callback: () => void){
    starTrack(curPlaylist.value[curPlayIndex.value].id,starred).then(_ => {
      callback()
    })
  }

  function playRemove(id: string){
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
      case PlayChangeMode.ADD_CUR://添加到当前播放文件之前并立即播放
        addSeqCur()
        switchPlay()
        break
      case PlayChangeMode.ADD_NEXT://添加到当前播放文件之后
        addSeqNext()
        break
      case PlayChangeMode.ADD_LAST://添加到当前播放文件之后并播放
        addSeqLast()
        break
      case PlayChangeMode.REPLACE_LIST://替换当前播放列表
        replaceSeqList()
        switchPlay()
        break
      case PlayChangeMode.REPLACE_LIST_RND://替换当前播放列表
        seqOrder.value = SeqMode.LIST_RND
        replaceSeqList()
        switchPlay()
        break
      case PlayChangeMode.ADD_LIST_LAST://添加到当前播放列表末尾
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
          track.starred = data.starred
          track.cover = baseSrcURL + 'getcover?size=500&id=' + tid
        })
        if (audioRef.value) audioRef.value.src = baseSrcURL + 'stream?id=' + tid
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
    playStatus,
    playInfo,
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
    handleStar,
    playlistItemClick
  }
}