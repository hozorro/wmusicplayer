import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/store/auth";

declare module "vue-router" {
  interface RouteMeta {
    /** 隐藏悬浮播放条 （页面级声明，PlayBox不卸载） */
    hidePlayBar?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  { 
    path: "/",
    name: "play",
    component: () => import("@/layouts/Play.vue"),
    children: [
      { path: "", name: "home", component: () => import("@/views/player/Index.vue") },
      {
        path: "/album",
        children: [
          { path: ":id", name: "album", component: () => import("@/views/player/Album.vue") }
        ]
      },{
        path: "/artist",
        children: [
          { path: "", name: "artist-list", component: () => import("@/views/player/ArtistList.vue") },
          { path: "favourite", name: "favourite-artists", component: () => import("@/views/player/FavArtists.vue")},
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
      },
      { path: "/favourite", name: "favourite", component: () => import("@/views/player/Favourite.vue") },
      { path: "/random", name: "random", component: () => import("@/views/player/Random.vue") },
      { path: "/search", name: "search", component: () => import("@/views/player/Search.vue") },

      {
        path: "/setting",
        name: "setting-list",
        component: () => import("@/layouts/Setting.vue"),
        meta: { hidePlayBar: true },
        children: [
          { path: "", name: "setting", component: () => import("@/views/setting/Index.vue") },
          { path: "play", name: "setting-play", component: () => import("@/views/setting/Play.vue") },
          { path: "sync", name: "setting-sync", component: () => import("@/views/setting/Sync.vue") },
          { path: "help", name: "setting-help", component: () => import("@/views/setting/Help.vue") },
          { path: "about", name: "setting-about", component: () => import("@/views/setting/About.vue") },
          { path: "test", name: "setting-test", component: () => import("@/views/setting/TestView.vue") }
        ]
      }
    ]
  }, {
    path: "/login", name: "login", component: () => import("@/views/auth/Login.vue"),
  }
]

const testRoute = {
  path: "/dev",
  component: () => import("@/layouts/Blank.vue"),
  children: [
    { path: "lockscreen", name: "test-lockscreen", component: () => import("@/views/dev/LockScreenTest.vue") },
    { path: "runtime", name: "test-runtime", component: () => import("@/views/dev/RuntimeLab.vue") },
    { path: "player", name: "test-player", component: () => import("@/views/dev/PlayerLab.vue") },
  ]
}
if (import.meta.env.DEV) routes.push(testRoute)

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _, next) => { 
  const authStore = useAuthStore()

  if(to.path === '/login' || to.path === '/register') {
    if (to.path === '/login' && authStore.isAuthenticated) {
      return next('/')
    }
    return next()
  }

  if (!authStore.isAuthenticated) {
    const refreshed = await authStore.refresh()
    if(!refreshed) {
      return next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    }
  }

  return next()
});

export default router;