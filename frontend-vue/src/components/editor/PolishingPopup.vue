<script setup lang="ts">
import type { CompletionOption } from '@/types';

defineProps<{
  options: CompletionOption[];
  position: { top: number; left: number } | null;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'apply', text: string): void;
  (e: 'close'): void;
}>();
</script>

<template>
  <div 
    v-if="position"
    class="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 w-80 max-h-96 overflow-y-auto"
    :style="{ top: `${position.top}px`, left: `${position.left}px` }"
  >
    <div v-if="isLoading" class="flex items-center justify-center p-4 text-gray-500">
      <span class="animate-spin mr-2">⏳</span> 思考中...
    </div>

    <div v-else-if="options.length === 0" class="p-2 text-gray-500 text-sm">
      无建议
    </div>

    <ul v-else class="space-y-2">
      <li 
        v-for="(opt, idx) in options" 
        :key="idx"
        class="group cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 p-2 rounded transition-colors"
        @click="emit('apply', opt.text)"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
            {{ opt.label }}
          </span>
        </div>
        <p class="text-sm text-gray-800 dark:text-gray-200">{{ opt.text }}</p>
        <p v-if="opt.description" class="text-xs text-gray-500 mt-1">{{ opt.description }}</p>
      </li>
    </ul>
    
    <button 
      class="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
      @click="emit('close')"
    >
      ×
    </button>
  </div>
</template>
