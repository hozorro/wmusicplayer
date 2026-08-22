// Raw 形状出口：派生字段剥离，transform 消费面不变
import type { IDBTrack, IDBAlbum, IDBArtist } from "../shapes/idb"
import type { RawTrack, RawAlbum, RawArtist } from "../shapes/raw"

export const toRawTrack = ({ title_lower, album_id, artist_ids, genre_titles, ...raw}: IDBTrack): RawTrack => raw
export const toRawAlbum = ({ title_lower, album_artist_id, artist_ids, ...raw}: IDBAlbum): RawAlbum => raw
export const toRawArtist = ({ name_lower, ...raw}: IDBArtist): RawArtist => raw

export const genreRange = (gid: number) => IDBKeyRange.bound([gid], [gid, '\uffff'])
export const favRange = IDBKeyRange.lowerBound('')