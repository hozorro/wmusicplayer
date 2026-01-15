<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useWatcher } from 'alova/client';
import { useI18n } from 'vue-i18n';
import CollectionItem from '@/components/CollectionItem.vue';
import TrackItem from '@/components/TrackItem.vue';
import useCollectionOperations from '@/composables/collection-operations';
import useTrackOperations from '@/composables/track-operations';
import { getFolder } from '@/apis/methods/music';

const { t } = useI18n();

const route = useRoute();
const folderId = computed(() => parseInt(route.params.id as string) || 1);
const { data: folder } = useWatcher(
  () => getFolder(folderId.value as number),
  [folderId],
  {
    immediate: true,
    initialData: { name: '', tracks: [], sub_folders: [] },
  }
);
const { handleOperation: handleFolderOperation } = useCollectionOperations('folder');
const { handleClick, handleOperation: handleTrackOperation } = useTrackOperations();

function handleOperation(oType: string, oId: number, oTitle: string) {
  if (oType === 'folder') {
    handleFolderOperation(oId as number, oTitle);
  } else {
    handleTrackOperation(oId as number, oTitle);
  }
}
</script>

<template>
  <div class=" fixed top-0 left-0 p-2 bg-light dark:bg-dark w-full z-20">
    <router-link :to="folder.parent_id ? {name: 'folder', params: {id: folder.parent_id.toString()}} : '/'" class=" w-full text-lg font-semibold">
      <span class=" icon-[solar--alt-arrow-left-linear] align-middle"></span>{{ t('player.folder') }}: {{ folder.name }}
    </router-link>
  </div>
  <div class=" w-full pt-12 px-2 pb-2">
    <div class=" w-full bg-stone-50 dark:bg-teal-800/50 rounded-md p-2" v-if="folder.children?.length > 0">
      <CollectionItem v-for="f in folder.children"
        col-type="folder"
        :id="f.id"
        :name="f.name"
        @operation="(id: number, name: string) => handleOperation('folder', id, name)"
      />
    </div>
    <div class=" w-full  bg-stone-50 dark:bg-teal-800/50 rounded-md p-2" v-if="folder.tracks?.length > 0">
      <TrackItem v-for="t in folder.tracks"
        :id="t.id"
        :title="t.title"
        :sub-info="t.artists?.join(', ')"
        :art="t.cover"
        :show-art="true"
        @item-click="handleClick"
        @operation="(id: number, title: string) => handleOperation('track', id, title)"
      />
    </div>
  </div>
</template>