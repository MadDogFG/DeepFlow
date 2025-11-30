<script setup lang="ts">
defineProps<{
  content: string;
  ghostText: string;
}>();
</script>

<template>
  <div 
    class="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden whitespace-pre-wrap break-words p-4 font-mono text-lg leading-relaxed text-transparent"
    aria-hidden="true"
  >
    {{ content }}<span class="text-gray-400 opacity-60">{{ ghostText }}</span>
  </div>
</template>

<style scoped>
/* Ensure these styles match the textarea exactly */
div {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style>
