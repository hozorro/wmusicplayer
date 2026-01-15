<script setup lang="ts">
import { onMounted, useTemplateRef, type Component } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const dlgRef = useTemplateRef('dlgRef');
interface WDialogProps {
  title?: string;
  content?: Component;
  contentProps?: Record<string, any>;
}
const {
  title = 'Information',
  content = null,
  contentProps = {}
} = defineProps<WDialogProps>();
const emit = defineEmits(['close', 'confirm', 'select']);

onMounted(() => {
  dlgRef.value?.showModal();
});

function handleClose() {
  emit('close');
  dlgRef.value?.close();
}
function handleConfirm(payload?: any) {
  emit('confirm', payload);
  dlgRef.value?.close();
}
function handleSelect(value: {close: boolean; payload?: any}) {
  if (value.close) {
    dlgRef.value?.close();
  }
  emit('select', value.payload);
}
</script>

<template>
  <dialog ref="dlgRef" class=" rounded-t-md p-2 w-full top-1/5 bottom-0 h-4/5" style="max-width: none;"> <!-- 'max-width: none;' is important -->
    <div class=" flex justify-between items-center p-2 border-b border-b-gray-200">
      <div>{{ title }}</div>
      <div @click="handleClose" class="text-cyan-600">{{ t('common.close') }}</div>
    </div>
    <div class="p-2">
      <component :is="content" v-bind="contentProps" @select="handleSelect" @confirm="handleConfirm" @close="handleClose" />
    </div>
  </dialog>
</template>