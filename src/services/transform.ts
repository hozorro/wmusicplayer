import type { PlayTrack } from "@/player/types";

export function toPlayTrack(track: Track, extra?: { [key in keyof PlayTrack]?: any }): PlayTrack {
  return {
    id: track.id,
    title: track.title,
    artists: track.artists?.length ? track.artists : [],
    album: track.album,
    duration: track.duration,
    cover: formatTrackArt(track),
    ...extra,
  };
}

export function toDetailText(track: TrackMoreInfo): string {
  const text = `
  TITLE: ${track.title}\n
  YEAR: ${track.year ?? 'Unknown'}\n
  BITRATE: ${track.bitrate ?? 'Unknown'}\n
  BR_MODE: ${track.bitrate_mode ?? 'Unknown'}\n
  ACOUSTID: ${track.acoustid_id ?? 'Unknown'}\n
  MB_TRACKID: ${track.mb_trackid ?? 'Unknown'}\n
  PATH: ${track.path ?? 'Unknown'}\n
  `
  return text
}

export function formatTrackArt(track: Track): string {
  return `/media/tracks/${track.id}.jpg?v=${track?.cover_art_hash}`
}

export function formatAlbumArt(album: Album): string {
  return `/media/albums/${album.id}.jpg?v=${album?.cover_art_hash}`
}

export function formatArtistArt(artist: Omit<Artist, 'pinyin_initial'>, kind: 'face' | 'portrait'): string {
  return `/media/artists/${artist.id}_${kind}.jpg?v=${artist?.[kind + '_art_hash' as keyof Omit<Artist, 'pinyin_initial'>]}`
}

export function formatPlaylistArt(playlist: Playlist): string {
  return `/media/playlists/${playlist.id}.jpg?v=${playlist?.cover_art_hash}`
}
