<script setup lang="ts">
import { useRequest } from 'alova/client';
import CollectionItem from '@/components/CollectionItem.vue';
import useCollectionOperations from '@/composables/collection-operations';
import { getGenres } from '@/apis/methods/music';

const { data: genres } = useRequest(getGenres, {
  initialData: []
});

const { handleOperation } = useCollectionOperations('genre');
</script>

<template>
  <router-link to="/" class=" fixed top-0 left-0 p-2 bg-gray-100 w-full z-20">
    <span class=" icon-[solar--alt-arrow-left-linear] align-middle text-2xl"></span>流派
  </router-link>
  <div class=" w-full mt-9 p-2">
    <div class=" w-full">
      <CollectionItem v-for="g in genres"
        col-type="genre"
        :id="g.id"
        :name="g.name"
        :art="g.cover"
        @operation="handleOperation"
      />
    </div>
  </div>
</template>