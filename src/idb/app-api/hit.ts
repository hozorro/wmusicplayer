import { mutateEntity } from "./common";
import { playbackWriter } from "@/services/playback-data";
import type { IDBTrack, IDBArtist, IDBPlaylist } from "../shapes/idb";
import { updateTrackHit, updateArtistHit, updatePlaylistHit } from "@/apis/methods/music";

/** 计次：纯技术递增（hits deprecated），事务型防并发丢失 */
export function bumpTrackHit(trackId: number): Promise<boolean> {
  const at = new Date().toISOString();
  return playbackWriter.write({
    key: `hit:track:${trackId}:${at}`,
    label: `歌曲播放计次《${trackId}》`,
    opType: 'hit-track',
    payload: { id: trackId, at },
    local: () => mutateEntity<IDBTrack>('tracks', trackId, t => ({ ...t, hits: [...(t.hits ?? []), at], hit_count: (t.hit_count ?? 0) + 1 })),
    remote: () => updateTrackHit(trackId).send()
  });
}

export function bumpArtistHit(artistId: number): Promise<boolean> {
  const at = new Date().toISOString();
  return playbackWriter.write({
    key: `hit:artist:${artistId}:${at}`,
    label: `歌手播放计次《${artistId}》`,
    opType: 'hit-artist',
    payload: { id: artistId, at },  // 此处at无意义，后续drain时不会用到，remote用的服务端时间
    local: () => mutateEntity<IDBArtist>('artists', artistId, a => ({ ...a, hit_count: (a.hit_count ?? 0) + 1 })),
    remote: () => updateArtistHit(artistId).send()
  });
}

export function bumpPlaylistHit(playlistId: number): Promise<boolean> {
  const at = new Date().toISOString();
  return playbackWriter.write({
    key: `hit:playlist:${playlistId}:${at}`,
    label: `歌单播放计次《${playlistId}》`,
    opType: 'hit-playlist',
    payload: { id: playlistId, at },
    local: () => mutateEntity<IDBPlaylist>('playlists', playlistId, p => ({ ...p, hit_count: (p.hit_count ?? 0) + 1 })),
    remote: () => updatePlaylistHit(playlistId).send()
  });
}
