import type { PlayTrack } from "@/player/types";
import type { RouteLocationRaw } from 'vue-router';

export type CollectionKind = 'album' | 'artist' | 'genre' | 'folder' | 'playlist';

/** 菜单来源：kind映射菜单表；各 kind 携带各自动作所需的载荷 */
export type MenuSource = 
  | { kind: "track"; track: PlayTrack }
  | { kind: 'queue-track'; track: PlayTrack; index: number }
  | { kind: "playlist-track"; track: PlayTrack; onRemove: () => void }
  | {
      kind: CollectionKind;
      id: number;
      title: string;
      subinfo?: string;
      cover?: string;
      /** 页面注入的曲目解析能力（合集动作的异步供给端口） */
      resolveTracks?: () => Promise<PlayTrack[]>;
  }

export type MenuKind = MenuSource['kind'];

export interface CollectionItem {
  id: number
  title: string
  subinfo?: string
  cover?: string
  to: RouteLocationRaw
}