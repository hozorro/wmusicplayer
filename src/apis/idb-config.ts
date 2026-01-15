export default  {
  name: 'wmusiclib',
  version: 1,
  stores: [
    {
      name: 'meta',
      keyPath: 'name',
      isClear: true,
      indexes: [
        { name: 'name', keyPath: 'name', options: { unique: true }},
        // { name: 'value', keyPath: 'value', options: { unique: false }}
      ]
    },{
      name: 'album',
      keyPath: 'id',
      isClear: true,
      indexes: [
        { name: 'id', keyPath: 'id', options: { unique: true }},
        // { name: 'name', keyPath: 'name', options: { unique: false }},
        { name: 'title_lower', keyPath: 'title_lower', options: { unique: false }},
        { name: 'album_artist_id', keyPath: 'album_artist_id', options: { unique: false }},
        { name: 'artist_ids', keyPath: 'artist_ids', options: { multiEntry: true }}
      ]
    },{
      name: 'artist',
      keyPath: 'id',
      isClear: true,
      indexes: [
        { name: 'id', keyPath: 'id', options: { unique: true }},
        // { name: 'name', keyPath: 'name', options: { unique: false }},
        { name: 'name_lower', keyPath: 'name_lower', options: { unique: false }},
        { name: 'pinyin_initial', keyPath: 'pinyin_initial', options: { unique: false }},
        { name: 'favorited_at', keyPath: 'favorited_at', options: { unique: false }},
        { name: 'hit_count', keyPath: 'hit_count', options: { unique: false }}
      ]
    },{
      name: 'folder',
      keyPath: 'id',
      isClear: true,
      indexes: [
        { name: 'id', keyPath: 'id', options: { unique: true }},
        // { name: 'name', keyPath: 'name', options: { unique: false }},
        { name: 'parent_id', keyPath: 'parent_id', options: { unique: false }},
        { name: 'parent_child', keyPath: ['parent_id', 'name'], options: { unique: true }}
      ]
    },{
      name: 'genre',
      keyPath: 'id',
      isClear: true,
      indexes: [
        { name: 'id', keyPath: 'id', options: { unique: true }},
        // { name: 'name', keyPath: 'name', options: { unique: false }}
      ]
    },{
      name: 'track',
      keyPath: 'id',
      isClear: true,
      indexes: [
        { name: 'id', keyPath: 'id', options: { unique: true }},
        // { name: 'title', keyPath: 'title', options: { unique: false }},
        { name: 'title_lower', keyPath: 'title_lower', options: { unique: false }},
        { name: 'artist_ids', keyPath: 'artist_ids', options: { multiEntry: true }},
        { name: 'album_id', keyPath: 'album_id', options: { unique: false }},
        { name: 'genre_ids', keyPath: 'genre_ids', options: { multiEntry: true }},
        { name: 'folder_id', keyPath: 'folder_id', options: { unique: false }},
        { name: 'favorited_at', keyPath: 'favorited_at', options: { unique: false }},
        { name: 'hits', keyPath: 'hits', options: { unique: false }},
        { name: 'hit_count', keyPath: 'hit_count', options: { unique: false }},
        { name: 'updated_at', keyPath: 'updated_at', options: { unique: false }},
        { name: 'genre_titles', keyPath: 'genre_titles', options: { multiEntry: true }}
        /*
        Because some genres may have a large number of tracks, pagination needed.
        Records need to be sorted when paginated. 
        Therefore, for track queries, use genre_ids(multiEntry) to filter, and sort the track through title.
        But the filter and sort are not the same field, the best solution is to create a compound index.
        But the compound index cannot use multiEntry=true.
        Therefore, a compound field needs to be created. 
        Note that the elements of the compound field cannot be objects, otherwise the index cannot be created.
        For folder, artist and album filtering queries, since the filtering result set is small, use normal index, sort the result set in memory.
         */
      ]
    },{
      name: 'playlist',
      keyPath: 'id',
      isClear: true,
      indexes: [
        { name: 'id', keyPath: 'id', options: { unique: true }},
        // { name: 'name', keyPath: 'name', options: { unique: false }},
        { name: 'track_ids', keyPath: 'track_ids', options: { multiEntry: true }},
        { name: 'hit_count', keyPath: 'hit_count', options: { unique: false }}
      ]
    }
  ],
  init: () => { console.log('[IndexDB] idb init completed.') }
}