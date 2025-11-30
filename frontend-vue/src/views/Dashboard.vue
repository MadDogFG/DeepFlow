<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Sparkles, Settings, Upload, ArrowRight, BookOpen, Feather } from 'lucide-vue-next';
import SettingsModal from '@/components/SettingsModal.vue';
import { essayService } from '@/services/essayService';
import { generateInspiration } from '@/services/geminiService';
import type { Essay, PromptIdea } from '@/types';

const essays = ref<Essay[]>([]);
const isLoading = ref(true);
const isSettingsOpen = ref(false);
const dailyPrompt = ref<PromptIdea | null>(null);
const isPromptLoading = ref(false);
const inspirationHint = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const router = useRouter();

onMounted(async () => {
  try {
    essays.value = await essayService.getAll();
  } catch (e) {
    console.error("Failed to fetch essays", e);
  } finally {
    isLoading.value = false;
  }
});

const createNew = (topic?: string, description?: string) => {
  router.push({ path: '/editor', query: { topic, description } });
};

const openEssay = (id: string) => {
  router.push(`/editor/${id}`);
};

const fetchInspiration = async () => {
  isPromptLoading.value = true;
  try {
    const idea = await generateInspiration(inspirationHint.value);
    dailyPrompt.value = idea;
  } catch (e) {
    console.error("Inspiration failed", e);
  } finally {
    isPromptLoading.value = false;
  }
};

const handleImportClick = () => {
  fileInput.value?.click();
};

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const content = event.target?.result as string;
    if (content) {
      let title = file.name.replace('.md', '');
      let finalContent = content;
      
      const lines = content.split('\n');
      if (lines.length > 0 && lines[0].startsWith('# ')) {
        title = lines[0].replace('# ', '').trim();
        finalContent = lines.slice(1).join('\n').trim();
      }

      try {
        const newEssay = await essayService.create({
          title,
          content: finalContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          versions: []
        } as any);
        openEssay(newEssay.id);
      } catch (err) {
        console.error("Import failed", err);
      }
    }
  };
  reader.readAsText(file);
};

const scrollToHistory = () => {
  router.push('/history');
};
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans relative">
    <SettingsModal :is-open="isSettingsOpen" @close="isSettingsOpen = false" />
    
    <button 
      @click="isSettingsOpen = true"
      class="absolute top-8 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-stone-100 rounded-full transition-colors"
      title="设置"
    >
      <Settings class="w-5 h-5" />
    </button>

    <div class="max-w-4xl mx-auto px-6 py-12">
      <header class="mb-16 text-center">
        <h1 class="text-4xl md:text-5xl font-serif font-bold mb-4 tracking-tight">DeepFlow</h1>
        <p class="text-gray-500 text-lg">记录思考，认识真我</p>
      </header>

      <!-- Inspiration Section -->
      <section class="mb-12 bg-white rounded-2xl p-8 shadow-sm border border-stone-100 relative overflow-hidden group transition-all hover:shadow-md">
        <div class="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -z-10 opacity-60"></div>
        
        <div class="flex items-center gap-3 mb-6">
          <div class="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <Sparkles class="w-5 h-5" />
          </div>
          <h2 class="text-xl font-bold font-serif">灵感火花</h2>
        </div>

        <div v-if="dailyPrompt" class="animate-fade-in">
          <h3 class="text-2xl font-serif font-medium mb-3 text-gray-800 leading-snug">{{ dailyPrompt.topic }}</h3>
          <p class="text-gray-600 mb-8 leading-relaxed max-w-2xl">{{ dailyPrompt.description }}</p>
          <div class="flex gap-4">
            <button 
              @click="createNew(dailyPrompt.topic, dailyPrompt.description)"
              class="flex items-center gap-2 bg-ink text-white px-6 py-3 rounded-full hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
            >
              <Feather class="w-[18px] h-[18px]" />
              <span>以此题开始写作</span>
            </button>
            <button
              @click="dailyPrompt = null"
              class="px-6 py-3 rounded-full border border-stone-200 hover:bg-stone-50 text-gray-600 transition-colors"
            >
              重置
            </button>
          </div>
        </div>

        <div v-else class="text-center py-4">
          <div class="max-w-md mx-auto mb-6 relative">
            <input 
              v-model="inspirationHint"
              placeholder="给 AI 一个关键词 (可选)..." 
              class="w-full px-5 py-3 bg-stone-50 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-200 text-center placeholder-gray-400 transition-all"
              @keyup.enter="fetchInspiration"
            />
          </div>
          <p class="text-gray-500 mb-6 text-sm">
            点击生成获取今日深度话题，或输入关键词定向探索。
          </p>
          <button 
            @click="fetchInspiration"
            :disabled="isPromptLoading"
            class="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors text-gray-700 font-medium bg-white shadow-sm"
          >
            <span v-if="isPromptLoading" class="animate-pulse">思维激荡中...</span>
            <template v-else>
              <Sparkles class="w-[18px] h-[18px] text-orange-500" />
              <span>{{ inspirationHint ? '生成定制命题' : '随机获取命题' }}</span>
            </template>
          </button>
        </div>
      </section>

      <!-- Recent & Actions Grid -->
      <div class="grid md:grid-cols-2 gap-8">
        <!-- Quick Actions -->
        <div class="space-y-4">
          <h3 class="text-lg font-bold text-gray-400 uppercase tracking-wider text-xs mb-4">开始</h3>
          
          <button 
            @click="createNew()"
            class="w-full text-left p-6 bg-white rounded-xl border border-stone-100 shadow-sm hover:border-stone-300 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div class="flex items-center gap-4">
              <div class="bg-stone-100 p-3 rounded-full group-hover:bg-stone-200 transition-colors">
                <Plus class="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <span class="block font-bold text-lg text-gray-800">自由写作</span>
                <span class="text-sm text-gray-500">无题，随心而动</span>
              </div>
            </div>
            <ArrowRight class="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors" />
          </button>

          <div class="grid grid-cols-2 gap-4">
            <button 
              @click="scrollToHistory"
              class="w-full text-left p-6 bg-white rounded-xl border border-stone-100 shadow-sm hover:border-stone-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <div class="bg-stone-100 p-3 rounded-full group-hover:bg-stone-200 transition-colors">
                <BookOpen class="w-6 h-6 text-gray-700" />
              </div>
              <span class="font-bold text-gray-800">历史文章</span>
            </button>

            <button 
              @click="handleImportClick"
              class="w-full text-left p-6 bg-white rounded-xl border border-stone-100 shadow-sm hover:border-stone-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <div class="bg-stone-100 p-3 rounded-full group-hover:bg-stone-200 transition-colors">
                <Upload class="w-6 h-6 text-gray-700" />
              </div>
              <span class="font-bold text-gray-800">导入 MD</span>
              <input 
                ref="fileInput"
                type="file" 
                accept=".md,.txt" 
                class="hidden" 
                @change="handleFileChange"
              />
            </button>
          </div>
        </div>

        <!-- Recent List -->
        <div id="recent-essays">
          <h3 class="text-lg font-bold text-gray-400 uppercase tracking-wider text-xs mb-4">最近编辑</h3>
          
          <div v-if="isLoading" class="text-center py-12 text-gray-400">加载中...</div>
          
          <div v-else-if="essays.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400 bg-stone-50 rounded-xl border border-dashed border-stone-200 p-6 min-h-[200px]">
            <p>暂无记录</p>
          </div>

          <div v-else class="space-y-3">
            <div 
              v-for="essay in essays" 
              :key="essay.id"
              @click="openEssay(essay.id)"
              class="p-4 bg-white rounded-lg border border-transparent hover:border-stone-200 cursor-pointer transition-all hover:bg-stone-50 group shadow-sm"
            >
              <h4 class="font-serif font-bold text-gray-800 truncate mb-1 group-hover:text-orange-600 transition-colors">
                {{ essay.title || '无标题' }}
              </h4>
              <p class="text-xs text-gray-400">
                {{ new Date(essay.updatedAt).toLocaleDateString() }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
