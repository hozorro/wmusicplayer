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
        // 由于genre关联的track可能较多，有的genre下可能有几千条track记录，需要分页，
        // 分页时最好要对记录进行排序，因此对于track的查询，采用genre_ids(multientry）过滤，并对track通过title排序，
        // 过滤与排序不是同一字段，此时最佳方案是采用复合索引，但复合索引不能使用multiEntry=true。
        // 此时可创建复合字段，注意复合字段的元素不能为对象，否则不能创建索引。
        // 对于folder、artist和album的过滤查询，由于过滤结果集较小，采用普通索引，在内存中对结果集排序即可。
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
  init: () => { console.log('[IndexDB] 数据库初始化完成。') }
}