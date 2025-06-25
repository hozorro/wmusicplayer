export const PlayChangeMode = {
  ADD_CUR: 'ADD_CUR',
  ADD_NEXT: 'ADD_NEXT',
  ADD_LAST: 'ADD_LAST',
  REPLACE_LIST: 'REPLACE_LIST',
  REPLACE_LIST_RND: 'REPLACE_LIST_RND',
  ADD_LIST_LAST: 'ADD_LIST_LAST',
  DIRECT_PLAY: 'DIRECT_PLAY',
  DONOTHING: 'DONOTHING',
} as const;

export type PlayChangeMode = typeof PlayChangeMode[keyof typeof PlayChangeMode];

export const SeqMode = {
  LIST_ORDER: 0,
  LIST_RND: 1,
  SINGLE_LOOP: 2,
} as const;

export type SeqMode = typeof SeqMode[keyof typeof SeqMode];