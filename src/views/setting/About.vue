<script setup lang="ts">
</script>

<template>
  <div class=" p-2">
    <div class=" flex justify-between">
      <router-link to="/setting" class=" flex-none text-lg font-semibold"><span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span></router-link>
      <div class=" flex-1 text-lg font-semibold text-right">帮助</div>
    </div>
    <div class=" mt-4 p-2">
      <p class=" p-2">
        <span class=" font-bold text-cyan-700">WMusicPlayer</span> 是一个基于 Vue3 的PWA音乐播放<b>客户端</b>。技术栈主要包括 Vue3、Vite、Tailwindcss、PWA、workbox、IndexedDB等。
      </p>
      <p class=" p-2">
        <span class=" font-bold text-cyan-700">WMusicPlayer</span> 具有以下特点：<br>
      </p>
      <ul class=" ml-6">
        <li class=" list-disc">基于文件夹、歌手、专辑、流派来对音乐进行整理。</li>
        <li class=" list-disc">歌手原子化，多个歌手合唱的单曲会分别归于各个歌手名下。</li>
        <li class=" list-disc">流派原子化，包含多个流派的单曲会分别归于各个流派名下。</li>
        <li class=" list-disc">专辑组合化，包含多个歌手歌曲的专辑会分别归于各个歌手名下。</li>
        <li class=" list-disc">通过IndexedDB实现所有歌曲信息本地化，并可远程同步。</li>
        <li class=" list-disc">通过ServiceWorker实现离线操作，并可远程同步。</li>
        <li class=" list-disc">通过MediaSession实现了与播放设备的显示内容和操作同步。</li>
        <li class=" list-disc">通过PWA技术实现了APP化，可在桌面或移动端安装为APP。</li>
      </ul>
      <p class=" p-2">
        <span class=" font-bold text-cyan-700">WMusicPlayer</span> 由&reg;Enauvy业余开发。
      </p>
    </div>
  </div>
</template>