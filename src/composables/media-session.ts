import type { Ref } from 'vue'
import { getImageAsDataURI } from "@/utilies/general";
import defaultTrackArt from '@/assets/imgs/track_art.png'

export default function useMediaSession(audio: Ref<HTMLAudioElement>, track: TrackInfo, handlers:{[handler:string]: ()=>void}){
  if(!('mediaSession' in navigator)){
    return;
  }

  function updateMediaSessionState() {
    navigator.mediaSession.playbackState = audio.value.paused ? 'playing' : 'paused';
    navigator.mediaSession.setPositionState({
      duration: audio.value.duration,
      position: audio.value.currentTime,
      playbackRate: audio.value.playbackRate
    })
  }

  async function updateMediaSessionMetadata() {
    const artworkUrl = track.cover
    ? await getImageAsDataURI(track.cover)
    : defaultTrackArt

    const artwork = {
      src: artworkUrl as string,
      type: typeof artworkUrl == 'string' ? artworkUrl.substring(artworkUrl.indexOf(':') + 1, artworkUrl.indexOf(';')) : 'image/png'
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artists?.map((ar)=>ar.name).join(','),
      album: track.album,
      artwork: [artwork]
    })
  }

  const actionHanlders: Map<MediaSessionAction,MediaSessionActionHandler> = new Map([
    ['play', () => handlers.play()],
    ['pause', () => handlers.pause()],
    ['previoustrack', () => handlers.previous()],
    ['nexttrack', () => handlers.next()]
  ])

  for(const [action, handler] of actionHanlders){
    try {
      navigator.mediaSession.setActionHandler(action, handler)
    } catch(e) {
      console.log(`Mediasession action ${action} not supported yet`)
    }
  }

  const audioEvents = ['playing', 'paused', 'durationchange', 'timechange']
  for (const event of audioEvents) {
    audio.value.addEventListener(event, updateMediaSessionState)
  }

  audio.value.addEventListener('loadeddata', updateMediaSessionMetadata)
}