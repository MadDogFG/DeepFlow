<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Search, Trash2, Calendar } from 'lucide-vue-next';
import { essayService } from '@/services/essayService';
import ConfirmModal from '@/components/ConfirmModal.vue';
import type { Essay } from '@/types';

const router = useRouter();
const essays = ref<Essay[]>([]);
const searchTerm = ref('');
const modalConfig = ref({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  isDestructive: false
});

onMounted(async () => {
  try {
    essays.value = await essayService.getAll();
  } catch (e) {
    console.error("Failed to load essays", e);
  }
});

const handleBack = () => {
  router.push('/');
};

const openEssay = (id: string) => {
  router.push(`/editor/${id}`);
};

const requestDelete = (e: Event, id: string) => {
  e.stopPropagation();
  modalConfig.value = {
    isOpen: true,
    title: '删除文章',
    message: '确定要删除这篇文章吗？此操作无法撤销。',
    onConfirm: () => executeDelete(id),
    isDestructive: true
  };
};

const executeDelete = async (id: string) => {
  try {
    await essayService.delete(id);
    essays.value = await essayService.getAll();
    modalConfig.value.isOpen = false;
  } catch (e) {
    console.error("Delete failed", e);
  }
};

const filteredEssays = computed(() => {
  const term = searchTerm.value.toLowerCase();
  return essays.value.filter(e => 
    (e.title?.toLowerCase() || '').includes(term) || 
    (e.content?.toLowerCase() || '').includes(term)
  );
});
</script>

<template>
  <div class="min-h-screen bg-paper font-sans text-ink">
    <ConfirmModal 
      :is-open="modalConfig.isOpen"
      :title="modalConfig.title"
      :message="modalConfig.message"
      :is-destructive="modalConfig.isDestructive"
      @confirm="modalConfig.onConfirm"
      @cancel="modalConfig.isOpen = false"
    />

    <div class="max-w-4xl mx-auto px-6 py-12">
      <header class="flex items-center gap-4 mb-10">
        <button @click="handleBack" class="p-2 hover:bg-stone-200 rounded-full transition-colors">
          <ArrowLeft class="w-6 h-6" />
        </button>
        <h1 class="text-3xl font-serif font-bold">文章历史</h1>
      </header>

      <div class="mb-8 relative">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="搜索标题或内容..." 
          v-model="searchTerm"
          class="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
        />
      </div>

      <div class="space-y-4">
        <div v-if="filteredEssays.length > 0">
          <div 
            v-for="essay in filteredEssays" 
            :key="essay.id"
            @click="openEssay(essay.id)"
            class="bg-white p-6 rounded-xl border border-stone-100 shadow-sm hover:shadow-md hover:border-stone-300 transition-all cursor-pointer group relative mb-4"
          >
            <div class="pr-10">
              <h2 class="text-xl font-serif font-bold text-gray-800 mb-2 group-hover:text-orange-600 transition-colors">
                {{ essay.title || "无标题草稿" }}
              </h2>
              <p class="text-gray-500 text-sm line-clamp-2 mb-4 font-serif">
                {{ essay.content || "无内容..." }}
              </p>
              <div class="flex items-center gap-4 text-xs text-gray-400">
                <span class="flex items-center gap-1">
                  <Calendar class="w-3 h-3" />
                  {{ new Date(essay.updatedAt).toLocaleDateString() }} {{ new Date(essay.updatedAt).toLocaleTimeString() }}
                </span>
                <span v-if="essay.topic" class="bg-stone-100 px-2 py-0.5 rounded text-stone-500">
                  {{ essay.topic }}
                </span>
              </div>
            </div>
            
            <button 
              @click="(e) => requestDelete(e, essay.id)"
              class="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              title="删除"
            >
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </div>
        <div v-else class="text-center py-12 text-gray-400">
          <p>没有找到相关文章</p>
        </div>
      </div>
    </div>
  </div>
</template>
