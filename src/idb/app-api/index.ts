/** 统一导出 + handler 注册（依赖方向：app-api -> playback-data，无循环依赖） */
import { playbackSync } from "@/services/playback-data";
import { 
  favTrack, favArtist, 
  updateTrackHit, updateArtistHit, updatePlaylistHit,
  addTrackToPlaylist, removeTrackFromPlaylist, movePlaylistTrack } from "@/apis/methods/music";

playbackSync.registerHandler('fav-track', p => favTrack(p.id, p.is_favorited).send())
playbackSync.registerHandler('fav-artist', p => favArtist(p.id, p.is_favorited).send())
playbackSync.registerHandler("hit-track", p => updateTrackHit(p.id).send())
playbackSync.registerHandler('hit-artist', p => updateArtistHit(p.id).send())
playbackSync.registerHandler('hit-playlist', p => updatePlaylistHit(p.id).send())
playbackSync.registerHandler('add-track-to-playlist', p => addTrackToPlaylist(p.playlistId, p.trackId).send())
playbackSync.registerHandler('remove-track-from-playlist', p => removeTrackFromPlaylist(p.playlistId, p.trackId).send())
playbackSync.registerHandler('move-playlist-track', p => movePlaylistTrack(p.playlistId, p.trackId, p.newPosition).send())

export * from './fav'
export * from './hit'
export * from './playlist'
