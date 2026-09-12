import type { PlayTrack } from "@/player/types";

export function toPlayTrack(track: Track, extra?: { [key in keyof PlayTrack]?: any }): PlayTrack {
  return {
    id: track.id,
    title: track.title,
    artists: track.artists?.length ? track.artists : [],
    album: track.album,
    duration: track.duration,
    cover_art_hash: track.cover_art_hash,
    cover: coverUrl('track', track.id, track.cover_art_hash),
    ...extra,
  };
}

export function coverUrl(
  entity: 'track' | 'album' | 'artist' | 'playlist',
  id: number | string,
  hash?: string,
  kind?: 'face' | 'portrait'
): string {
  if (entity === 'artist')
    return hash ? `/media/artists/${id}_${kind}.jpg?v=${hash}` : ''
  else
    return hash ? `/media/${entity}s/${id}.jpg?v=${hash}` : ''
}
