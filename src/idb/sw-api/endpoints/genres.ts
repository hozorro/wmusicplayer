import { getLibraryIdb } from "@/idb";
import type { IDBGenre, IDBTrack } from "@/idb/shapes/idb";
import { MISS, json, type ApiHandler } from "../contract"
import { genreRange, toRawTrack } from "../shapes";
import { sample } from "@/utilies/general";


export const idbGetRandomGenres: ApiHandler = async () => {
  const idb = await getLibraryIdb()
  const genres = await idb.getAll<IDBGenre>("genres")
  return json(sample(genres, 8))
}

export const idbGetGenres: ApiHandler = async () => {
  const idb = await getLibraryIdb()
  const genres = await idb.getAll<IDBGenre>("genres")
  const withCount = await Promise.all(genres.map(async g => ({
    ...g,
    track_count: await idb.countByIndex('tracks', 'genre_titles', genreRange(g.id))
  })))
  return json(withCount)
}

export const idbGetGenre: ApiHandler = async ({ params }) => {
  const id = Number(params.id)
  const idb = await getLibraryIdb()
  const genre = await idb.get<IDBGenre>("genres", id)
  if (!genre) return MISS
  return json(genre)
}

export const idbGetGenreTracks: ApiHandler = async ({ params, query }) => {
  const id = Number(params.id)
  const idb = await getLibraryIdb()
  const page = Number(query.get('page') ?? 1)
  const pageSize = Number(query.get('page_size') ?? 30)
  const range = genreRange(id)
  const [tracks, total] = await Promise.all([
    idb.pageByIndex<IDBTrack>("tracks", "genre_titles", range, { offset: (page - 1) * pageSize, limit: pageSize }),
    idb.countByIndex('tracks', 'genre_titles', range)
  ])
  return json({tracks: tracks.map(toRawTrack), total, page, pageSize})
}
