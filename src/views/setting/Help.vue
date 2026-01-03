<script setup lang="ts">
</script>

<template>
  <div class=" p-2">
    <div class=" flex justify-between">
      <router-link to="/setting" class=" flex-none text-lg font-semibold"><span class=" icon-[solar--alt-arrow-left-linear] align-middle text-gray-600"></span></router-link>
      <div class=" flex-1 text-lg font-semibold text-right">帮助</div>
    </div>
    <div class=" mt-4 p-2">
      <h1>1. 初次运行</h1>
      <p>初次运行时，可进入设置-本地数据库，点击重建数据，将拉去服务器所有数据至本地indexeddb数据库。后续除播放、获取歌词、添加或编辑歌单为请求服务器外，其他所有请求都在本地完成。</p>
      <h1>2. 本地数据库</h1>
      <p>本地indexeddb数据库存放了所有数据，包括歌曲、歌手、专辑、歌单、流派、文件夹、收藏、播放记录。</p>
      <p>重建数据：将完全覆盖本地数据，谨慎操作！一般只在初次运行或本地数据库损坏时使用。</p>
      <p>检查更新：获取服务器和本地数据统计信息，并比较，判断是否要同步。</p>
      <p>同步全部：先上传本地数据（一般只有playlist的tracks、track和artist的hits以及track的starred数据）至服务器，然后重建本地数据库。（后续可考虑在服务器的track、artist、album、genre、folder等本地不可能更改的数据添加updated字段，记录更新时间，同步时，只同步更新时间之后的。）</p>
      <p>上传数据：先上传本地数据（一般只有playlist的tracks、track和artist的hits以及track的starred数据）至服务器，然后将服务器整合的上述数据同步至本地。</p>
      <h1>附1. 随机算法说明</h1>
      <p>
        歌手随机: reservoir算法选random_artists，然后reservoir算法选歌时同时判断track是否in random_artists，且已选歌手歌曲数量不能超过1。<br />
        约束歌手随机: reservoir算法，判断已选歌手歌曲数量 <br />
        歌手加权随机: reservoir算法加权选random_artists，然后reservoir算法选歌时同时判断track是否in random_artists，且已选歌手歌曲数量不能超过1。
      </p>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
h1 {
  @apply text-xl font-semibold my-2;
}
p {
  @apply text-base mt-2 ml-2;
}
</style>