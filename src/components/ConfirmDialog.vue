<script setup lang="ts">
/**
 * 轻量确认弹窗：用于退出登录等不可逆动作。
 * 遮罩点击 / 取消按钮 / Esc 均视为取消；busy 时锁定两个按钮防重复提交。
 */
import { onMounted, onUnmounted } from 'vue';

interface ConfirmDialogProps {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  busy?: boolean;
}

const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  message: '',
  confirmText: '',
  cancelText: '',
  danger: false,
  busy: false,
});

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

function cancel() {
  if (!open.value) return
  open.value = false
  emit('cancel')
}

function confirm() {
  if (!open.value || props.busy) return
  emit('confirm')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') cancel()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      data-testid="confirm-dialog-overlay"
      class=" fixed inset-0 z-[90] flex items-center justify-center bg-primary/60 px-4"
      @click="cancel"
    >
      <section
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class=" w-full max-w-sm rounded-2xl bg-primary p-5 shadow-2xl ring-1 ring-fg-primary/10"
        @click.stop
      >
        <h2 class=" text-base font-semibold text-fg-primary">{{ title }}</h2>
        <p v-if="message" class=" mt-2 text-sm text-fg-secondary">{{ message }}</p>
        <div class=" mt-5 flex justify-end gap-2">
          <button
            type="button"
            data-testid="confirm-dialog-cancel"
            class=" rounded-md bg-secondary px-4 py-2 text-sm text-fg-primary disabled:opacity-60"
            :disabled="busy"
            @click="cancel"
          >{{ cancelText }}</button>
          <button
            type="button"
            data-testid="confirm-dialog-confirm"
            class=" rounded-md px-4 py-2 text-sm disabled:opacity-60"
            :class="danger ? 'bg-rose-500/85 text-white hover:bg-rose-500' : 'bg-secondary text-fg-primary ring-1 ring-primary/10'"
            :disabled="busy"
            @click="confirm"
          >{{ confirmText }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
