# Introduction
WMusicplayer is a PWA music player programmed with Vue3, Typescript, Tailwindcss, VitePWA and Indexeddb. 
This program works together with [WMusicBase](https://github.com/hozorro/wmusicbase) and [WMusicMan](https://github.com/hozorro/wmusicman).

# Characteristic
- Encapsulates a powerful music playback engine on the audio html element through a three-layer structure of runtime-controller-facade and two layers of event structures: engine events and player events, which makes the project highly scalable.
- Uses IndexedDb to fully cache music data and playback information, and employs Service Workers to intercept most frontend requests, responding directly with cached IndexedDb data. This significantly reduces the number of backend requests and latency, making it perfect for music playback in low-network conditions.
- Based on the above design, combined with pre-caching and MediaSession integration, it can fully meet the requirements of the gesture verification (or gesture authorization) mechanism in iOS system. Whether in Safari or as a PWA desktop app, it can play perfectly and smoothly auto-play the next track，even when the screen is locked.

So, this project is perfect for personal and small team music playback systems.

# It can
- Show music through artists, albums, genres, folders and playlists with cover arts.
- Play music from artist, album, genre, folder, playlist, and lots of fun random modes.
- Create and edit playlists.
- Multiple ways to add to the playlist.
- Show lyrics.
- An interesting way to show playback history.
- Synchronize all or incremental music data and playback data to the local device, with playback data being synced to the backend in real time.

There are plenty of other fun feature details waiting for you to discover or to be developed if you are a coder and interested in it.

# Installation
- Build:
```bash
yarn install
yarn build
```
- Copy dist to your deploy server.
- Or use github action to deploy automatically.
- Or use docker, look up [wmusic-suite](https://github.com/hozorro/wmusic-suite).
