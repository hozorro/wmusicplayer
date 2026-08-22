// 后端同步端点返回形状（原子层）

export interface RawRef { id: number, name?: string, title?: string }

export interface RawTrack {
  id: number
  title: string
  artists?: {id: number, name: string }[]
  album?: {id: number, title: string }
  duration: number
  cover_art_hash?: string
  year?: number
  genre_ids: number[]
  folder_id: number
  created_at?: string     // ISO 8601，入库时间：最近添加排序依据（待后端确认）
  // playback 字段：后端权威，随同步下发
  favorited_at?: string
  hits?: string[]         // ISO 8601 时间戳数组
}

export interface RawArtist {
  id: number
  name: string
  pinyin_initial: string
  face_art_hash?: string
  portrait_art_hash?: string
  track_count: number
  favorited_at?: string
  hit_count?: number
}

export interface RawAlbum {
  id: number
  title: string
   /** 主歌手：id 精确关联 + name 展示用；缺失时不参与 album_artist_id 索引 */
  album_artist?: { id: number, name: string }
  /** 全 tracks 艺人并集（后端组合）：参与专辑反查键 */
  artists?: { id: number, name: string }[]
  cover_art_hash?: string
  track_count: number
}

export interface RawGenre { id: number, name: string, color: string }

export interface RawFolder { id: number, name: string, parent_id: number }

export interface RawPlaylist {
  id: number
  title: string
  comment?: string
  cover_art_hash?: string
  created_at: string
  /** 只存引用与顺序；曲目详情由 sw-api 从 tracks store 水合 */
  tracks: { id: number, position: number }[]
  hit_count?: number
}

/** 软删退役：删除以墓碑清单表达，本地不留僵尸实体 */
export interface syncDeleted {
  tracks: number[]
  playlists: number[]
  artists?: number[]
  albums?: number[]
  genres?: number[]
  folders?: number[]
}