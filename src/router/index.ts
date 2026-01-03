import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
// import { getCurrentUser } from "@/apis/methods/music";

const routes: RouteRecordRaw[] = [
  { 
    path: "/",
    name: "play",
    component: () => import("@/layouts/Play.vue"),
    children: [
    {
      path: "", 
      name: "player", 
      component: () => import("@/layouts/Player.vue"),
      children: [
        { path: "", name: "home", component: () => import("@/views/player/Home.vue") },
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
      ],
    }, {
      path: "/setting",
      name: "setting-list",
      component: () => import("@/layouts/Setting.vue"),
      children: [
        { path: "", name: "setting", component: () => import("@/views/setting/Index.vue") },
        { path: "play", name: "setting-play", component: () => import("@/views/setting/Play.vue") },
        { path: "localdb", name: "setting-localdb", component: () => import("@/views/setting/LocalDb.vue") },
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

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _, next) => { 
  if(to.path === '/login' || to.path === '/register') {
    return next()
  }

  const token = localStorage.getItem("token");
  const refresh_token = localStorage.getItem("refresh_token");
  if(!token && !refresh_token) {
    return next('/login')
  }
  // if(token) {
  //   try {
  //     await getCurrentUser()
  //     return next()
  //   } catch (error) {
  //     localStorage.removeItem("token")
  //     return next('/login')
  //   }
  // }
  return next()
});

export default router;