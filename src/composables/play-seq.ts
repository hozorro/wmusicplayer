import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useMusicStore } from "@/store/music";
import { SeqMode } from "@/constants/play-constants";
import { shuffle } from "@/utilies/general";

export function usePlaySeq(){
  // set another play order system.
  // then the play list will be displayed in original order, regardless of play mode changes
  const seqOrder = ref<SeqMode>(SeqMode.LIST_ORDER) 
  // 0-sequently 1-shuffle 2-single loop
  const seqList = ref<number[]>([])
  const seqIndex = ref(0)
  const musicStore = useMusicStore()
  const { curPlaylist, curPlayIndex } = storeToRefs(musicStore)
  function initSeq(){
    seqList.value = [...new Array(curPlaylist.value.length).keys()]
    if(seqList.value.length !== 0){
      seqIndex.value = seqList.value.indexOf(curPlayIndex.value)
    }
  }

  function addSeqCur(){
    // add to cur pos, the play index keep unchanged
    seqList.value = seqList.value.map(seq => { return seq >= curPlayIndex.value ? seq+1 : seq})
    seqList.value.splice(seqIndex.value, 0, curPlayIndex.value)
  }
  function addSeqNext(){
    // add to the next pos, the play index keep unchanged
    seqList.value = seqList.value.map(seq => { return seq > curPlayIndex.value ? seq+1 : seq})
    seqList.value.splice(seqIndex.value+1, 0, curPlayIndex.value+1)
  }
  function addSeqLast(){
    seqList.value.push(curPlaylist.value.length - 1)
  }
  function replaceSeqList(){
    seqList.value = [...new Array(curPlaylist.value.length).keys()]
    if(seqOrder.value === SeqMode.LIST_RND){
      shuffle(seqList.value)
    }
    seqIndex.value = 0
  }
  function addSeqListLast(){
    let extendList = Array.from(
      {length: curPlaylist.value.length - seqList.value.length},
      (_, i) => seqList.value.length + i
    )
    if(seqOrder.value === SeqMode.LIST_RND){
      shuffle(extendList)
    }
    seqList.value.push(...extendList)
  }
  function nextSeqMode(){
    seqOrder.value = (seqOrder.value + 1) % 3 as SeqMode
    if(seqList.value.length !== 0){
      switch(seqOrder.value){
        case SeqMode.LIST_ORDER:
          seqList.value = [...new Array(curPlaylist.value.length).keys()]
          seqIndex.value = seqList.value.indexOf(curPlayIndex.value)
          break
        case SeqMode.LIST_RND:
          let preIndexList = seqList.value.slice(0, seqIndex.value)
          shuffle(preIndexList)
          let nextIndexList = seqIndex.value == seqList.value.length - 1 ? [] : seqList.value.slice(seqIndex.value + 1)
          shuffle(nextIndexList)
          seqList.value = [...preIndexList, seqList.value[seqIndex.value], ...nextIndexList]
          break
        default:
          break
      }
    }
  }

  if(seqList.value.length === 0){ 
    initSeq() 
  }

  return {
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
  }
}