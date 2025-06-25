import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: () => import("@/views/player/Home.vue") },
  {
    path: "/album",
    children: [
      { path: ":id", name: "album", component: () => import("@/views/player/Album.vue") }
    ]
  },{
    path: "/artist",
    children: [
      { path: "", name: "artist-list", component: () => import("@/views/player/ArtistList.vue") },
      { path: ":id", name: "artist", component: () => import("@/views/player/Artist.vue") }
    ]
  },{
    path: "/folder",
    children: [
      { path: ":id", name: "folder", component: () => import("@/views/player/Folder.vue") }
    ]
  },{
    path: "/genre",
    children: [
      { path: "", name: "genre-list", component: () => import("@/views/player/GenreList.vue") },
      { path: ":id", name: "genre", component: () => import("@/views/player/Genre.vue") }
    ]
  },{
    path: "/playlist",
    children: [
      { path: "", name: "playlist-all", component: () => import("@/views/player/PlaylistAll.vue") },
      { path: ":id", name: "playlist", component: () => import("@/views/player/Playlist.vue") }
    ]
  },{
    path: "/favourite",name: "favourite", component: () => import("@/views/player/Favourite.vue")
  },{
    path: "/test",name: "test", component: () => import("@/views/player/Test.vue")
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;