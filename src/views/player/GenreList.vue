<script setup lang="ts">
import { useRequest } from 'alova/client';
import { useI18n } from 'vue-i18n';
import CollectionItem from '@/components/CollectionItem.vue';
import useCollectionOperations from '@/composables/collection-operations';
import { getGenres } from '@/apis/methods/music';

const { t } = useI18n();

const { data: genres } = useRequest(getGenres, {
  initialData: []
});

const { handleOperation } = useCollectionOperations('genre');
</script>

<template>
  <router-link to="/" class=" fixed top-0 left-0 p-2 bg-light dark:bg-dark w-full z-20 text-lg font-semibold">
    <span class=" icon-[solar--alt-arrow-left-linear] align-middle"></span>{{ t('player.genre') }}
  </router-link>
  <div class=" w-full mt-9 p-2">
    <div class=" w-full">
      <CollectionItem v-for="g in genres"
        col-type="genre"
        :id="g.id"
        :name="g.name"
        :art="g.cover"
        :query="{back:'genre-list'}"
        @operation="handleOperation"
        :style="`background-color:rgba(${g.info},0.1);`"
        class="rounded-md"
      />
    </div>
  </div>
</template>