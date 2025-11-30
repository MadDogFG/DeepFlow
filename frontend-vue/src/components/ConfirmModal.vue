<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}>(), {
  confirmText: "确定",
  cancelText: "取消",
  isDestructive: false,
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
    <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-stone-100 transform transition-all scale-100 opacity-100">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4 text-gray-800">
           <div :class="['p-2 rounded-full', isDestructive ? 'bg-red-100 text-red-500' : 'bg-indigo-100 text-indigo-500']">
               <AlertTriangle class="w-6 h-6" />
           </div>
          <h3 class="text-lg font-bold font-serif">{{ title }}</h3>
        </div>
        <p class="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
          {{ message }}
        </p>
        <div class="flex gap-3">
          <button
            @click="emit('cancel')"
            class="flex-1 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-gray-700 rounded-lg transition-colors font-medium text-sm"
          >
            {{ cancelText }}
          </button>
          <button
            @click="emit('confirm')"
            :class="['flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm shadow-sm', isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700']"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
