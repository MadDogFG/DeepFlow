<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Save, Brain, X, Check, RefreshCw, Download, History, RotateCcw, Zap, Wand2 } from 'lucide-vue-next';
import { essayService } from '@/services/essayService';
import { analyzeStructure, generateGhostCompletion, generatePolishingOptions } from '@/services/geminiService';
import { getAISettings } from '@/services/storage';
import ConfirmModal from '@/components/ConfirmModal.vue';
import type { Essay, EssayVersion, StructureSuggestion, CompletionOption } from '@/types';
import { AIStatus } from '@/types';

// ==========================================
// State Management
// ==========================================

const route = useRoute();
const router = useRouter();

const title = ref('');
const content = ref('');
const topic = ref('');
const topicDescription = ref('');
const versions = ref<EssayVersion[]>([]);
const lastSaved = ref<number | null>(null);
const essayId = ref<string | null>(null);

// AI: Ghost Text
const ghostSuggestions = ref<string[]>([]);
const ghostIndex = ref(0);
const isGhostLoading = ref(false);
const ghostDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);

// AI: Polishing
const selectedText = ref('');
const selectionRange = ref<{start: number, end: number} | null>(null);
const popupPosition = ref<{top: number, left: number} | null>(null);
const polishingOptions = ref<CompletionOption[]>([]);
const polishingLoading = ref(false);
const showPolishingButton = ref(false);

// AI: Structure Analysis
const analysisStatus = ref<AIStatus>(AIStatus.IDLE);
const structuralTips = ref<StructureSuggestion[]>([]);
const showTips = ref(false);

// UI State
const showTopicDetail = ref(false);
const showVersions = ref(false);
const showToast = ref(false);

// Modal State
const modalConfig = ref({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  isDestructive: false
});

// Refs
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const overlayRef = ref<HTMLDivElement | null>(null);
const saveTimerRef = ref<ReturnType<typeof setTimeout> | null>(null);

// Computed
const ghostText = computed(() => ghostSuggestions.value.length > 0 ? ghostSuggestions.value[ghostIndex.value] : '');
const aiStatusColor = computed(() => {
  if (isGhostLoading.value) return 'text-yellow-400 animate-pulse';
  if (ghostSuggestions.value.length > 0) return 'text-green-500';
  return 'text-gray-300';
});

// ==========================================
// Lifecycle & Initialization
// ==========================================

onMounted(async () => {
  const id = route.params.id as string;
  if (id) {
    essayId.value = id;
    try {
      const essay = await essayService.getById(id);
      if (essay) {
        title.value = essay.title;
        content.value = essay.content;
        topic.value = essay.topic || '';
        topicDescription.value = essay.topicDescription || '';
        versions.value = essay.versions || [];
      }
    } catch (e) {
      console.error("Failed to load essay", e);
    }
  } else {
    // New Essay
    const queryTopic = route.query.topic as string;
    const queryDesc = route.query.description as string;
    if (queryTopic) {
      topic.value = queryTopic;
      topicDescription.value = queryDesc;
    }
  }
});

onUnmounted(() => {
  if (ghostDebounceTimer.value) clearTimeout(ghostDebounceTimer.value);
  if (saveTimerRef.value) clearTimeout(saveTimerRef.value);
});

// ==========================================
// Auto-Save Logic
// ==========================================

// Watch for content changes for auto-save
watch([title, content], () => {
  if (saveTimerRef.value) clearTimeout(saveTimerRef.value);
  
  saveTimerRef.value = setTimeout(() => {
    if (title.value || content.value) {
      handleSave(false);
    }
  }, 2000);
});

const handleSave = async (notify = true) => {
  const now = new Date().toISOString();
  const essayData: Partial<Essay> = {
    title: title.value,
    content: content.value,
    topic: topic.value,
    topicDescription: topicDescription.value,
    versions: versions.value,
    updatedAt: now,
  };

  try {
    if (essayId.value) {
      await essayService.update(essayId.value, essayData);
    } else {
      const newEssay = await essayService.create({
        ...essayData,
        createdAt: now,
        versions: []
      } as any);
      essayId.value = newEssay.id;
      router.replace(`/editor/${newEssay.id}`);
    }
    
    lastSaved.value = Date.now();
    if (notify) {
      showToast.value = true;
      setTimeout(() => showToast.value = false, 2000);
    }
  } catch (e) {
    console.error("Save failed", e);
  }
};

// ==========================================
// Core Logic
// ==========================================

const handleScroll = () => {
  if (textareaRef.value && overlayRef.value) {
    overlayRef.value.scrollTop = textareaRef.value.scrollTop;
  }
};

const handleExportMarkdown = () => {
  const markdownContent = `# ${title.value || 'Untitled'}\n\n${content.value}`;
  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.value || 'essay'}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleBack = () => {
  router.push('/');
};

// ==========================================
// Ghost Text Logic
// ==========================================

const triggerGhostText = async (textToPredict: string) => {
  // Only trigger if cursor is at the end and text is long enough
  if (textareaRef.value && textareaRef.value.selectionStart === textToPredict.length && textToPredict.length > 2) {
    isGhostLoading.value = true;
    const suggestions = await generateGhostCompletion(textToPredict);
    isGhostLoading.value = false;

    // Double check cursor position hasn't moved
    if (textareaRef.value && textareaRef.value.selectionStart === textToPredict.length) {
      if (suggestions.length > 0) {
        ghostSuggestions.value = suggestions;
        ghostIndex.value = 0;
      }
    }
  }
};

// Watch content for ANY change to trigger ghost text
watch(content, (newContent) => {
  ghostSuggestions.value = [];
  if (ghostDebounceTimer.value) clearTimeout(ghostDebounceTimer.value);

  const settings = getAISettings();
  const delay = settings.ghostDelay || 1000;

  ghostDebounceTimer.value = setTimeout(() => {
    triggerGhostText(newContent);
  }, delay);
});

const acceptGhostText = (e: KeyboardEvent) => {
  if (ghostText.value) {
    e.preventDefault();
    const newContent = content.value + ghostText.value;
    content.value = newContent;
    ghostSuggestions.value = [];
    
    // Trigger next prediction will be handled by the watcher
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.selectionStart = newContent.length;
        textareaRef.value.selectionEnd = newContent.length;
      }
    });
  }
};

// ==========================================
// Polishing Logic
// ==========================================

const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
  const styles = window.getComputedStyle(element);
  const div = document.createElement('div');

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.width = styles.width;
  div.style.fontFamily = styles.fontFamily;
  div.style.fontSize = styles.fontSize;
  div.style.lineHeight = styles.lineHeight;
  div.style.padding = styles.padding;
  div.style.border = styles.border;
  div.style.boxSizing = styles.boxSizing;

  div.textContent = element.value.substring(0, position);
  
  const span = document.createElement('span');
  span.textContent = '|';
  div.appendChild(span);

  document.body.appendChild(div);
  const top = span.offsetTop - element.scrollTop;
  const left = span.offsetLeft - element.scrollLeft;
  const lineHeight = parseFloat(styles.lineHeight) || 24;
  document.body.removeChild(div);
  
  return { top: top + lineHeight, left };
};

const checkSelection = () => {
  if (!textareaRef.value) return;
  const start = textareaRef.value.selectionStart;
  const end = textareaRef.value.selectionEnd;
  
  if (start === end) {
    // Clear selection state if clicked away or arrow keys used without shift
    if (selectedText.value) {
      showPolishingButton.value = false;
      polishingOptions.value = [];
      selectedText.value = '';
      selectionRange.value = null;
      popupPosition.value = null;
      polishingLoading.value = false;
    }
  }
};

const handleSelect = () => {
  if (!textareaRef.value) return;
  
  const start = textareaRef.value.selectionStart;
  const end = textareaRef.value.selectionEnd;
  const currentSelectionText = content.value.substring(start, end);

  if ((end - start) > 1) {
    if (currentSelectionText !== selectedText.value) {
      selectedText.value = currentSelectionText;
      selectionRange.value = { start, end };
      
      const coords = getCaretCoordinates(textareaRef.value, end);
      popupPosition.value = { top: coords.top + 10, left: coords.left };
      
      // Show button first, not options immediately
      showPolishingButton.value = true;
      polishingOptions.value = [];
    }
  } else {
    // Clear selection state
    checkSelection();
  }
};

const triggerPolishing = async () => {
  showPolishingButton.value = false;
  polishingLoading.value = true;
  
  try {
    const options = await generatePolishingOptions(selectedText.value, content.value.substring(0, selectionRange.value!.start));
    polishingOptions.value = options;
  } finally {
    polishingLoading.value = false;
  }
};

const applyPolishing = (optionText: string) => {
  if (selectionRange.value) {
    const before = content.value.substring(0, selectionRange.value.start);
    const after = content.value.substring(selectionRange.value.end);
    const newContent = before + optionText + after;
    
    content.value = newContent;
    polishingOptions.value = [];
    selectedText.value = '';
    selectionRange.value = null;
    popupPosition.value = null;
    showPolishingButton.value = false;
    
    nextTick(() => {
      if (textareaRef.value) {
        const newPos = selectionRange.value!.start + optionText.length;
        textareaRef.value.focus();
        textareaRef.value.setSelectionRange(newPos, newPos);
      }
    });
  }
};

// ==========================================
// Version Control & Structure Analysis
// ==========================================

const requestApplyRewrite = (newContent: string, styleName: string) => {
  modalConfig.value = {
    isOpen: true,
    title: '应用 AI 建议',
    message: `确定要应用“${styleName}”版本吗？\n当前文章内容将自动备份到“历史版本”中，您可以随时恢复。`,
    onConfirm: () => executeApplyRewrite(newContent, styleName),
    isDestructive: false
  };
};

const executeApplyRewrite = (newContent: string, styleName: string) => {
  const backupVersion: EssayVersion = {
    timestamp: Date.now(),
    content: content.value,
    title: title.value,
    note: `AI重构前 (${styleName})`
  };

  const newVersions = [backupVersion, ...versions.value];
  versions.value = newVersions;
  content.value = newContent;
  showTips.value = false;
  modalConfig.value.isOpen = false;
  
  handleSave(true);
};

const requestRestoreVersion = (v: EssayVersion) => {
  modalConfig.value = {
    isOpen: true,
    title: '恢复历史版本',
    message: `确定要恢复到 ${new Date(v.timestamp).toLocaleTimeString()} 的版本吗？\n当前未保存的修改将被备份。`,
    onConfirm: () => executeRestoreVersion(v),
    isDestructive: false
  };
};

const executeRestoreVersion = (v: EssayVersion) => {
  const backupVersion: EssayVersion = {
    timestamp: Date.now(),
    content: content.value,
    title: title.value,
    note: `恢复历史前自动备份`
  };
  
  const newVersions = [backupVersion, ...versions.value];
  versions.value = newVersions;
  content.value = v.content;
  title.value = v.title;
  showVersions.value = false;
  modalConfig.value.isOpen = false;
  
  handleSave(true);
};

const handleAnalyzeStructure = async () => {
  if (!content.value.trim()) return;
  analysisStatus.value = AIStatus.LOADING;
  showTips.value = true;
  const tips = await analyzeStructure(content.value, topic.value);
  structuralTips.value = tips;
  analysisStatus.value = AIStatus.SUCCESS;
};

// ==========================================
// Key Bindings
// ==========================================

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.altKey && ghostSuggestions.value.length > 0) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      ghostIndex.value = (ghostIndex.value + 1) % ghostSuggestions.value.length;
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      ghostIndex.value = (ghostIndex.value - 1 + ghostSuggestions.value.length) % ghostSuggestions.value.length;
      return;
    }
  }

  if (e.key === 'Tab') {
    if (ghostText.value) {
      acceptGhostText(e);
      return;
    }
  }
  
  if (e.key === 'Escape') {
    if (polishingOptions.value.length > 0 || polishingLoading.value || showPolishingButton.value) {
      polishingOptions.value = [];
      polishingLoading.value = false;
      showPolishingButton.value = false;
      selectedText.value = '';
      textareaRef.value?.focus();
    } else {
      showTips.value = false;
      showTopicDetail.value = false;
      showVersions.value = false;
      modalConfig.value.isOpen = false;
    }
    return;
  }
  
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    handleSave(true);
    return;
  }
};
</script>

<template>
  <div class="flex flex-col h-screen bg-paper overflow-hidden font-sans">
    <!-- Toast -->
    <div v-if="showToast" class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-2 rounded-full shadow-lg text-sm font-medium z-50 animate-fade-in-up flex items-center gap-2">
      <Check class="w-4 h-4 text-green-400" />
      已保存
    </div>

    <ConfirmModal 
      :is-open="modalConfig.isOpen"
      :title="modalConfig.title"
      :message="modalConfig.message"
      :is-destructive="modalConfig.isDestructive"
      @confirm="modalConfig.onConfirm"
      @cancel="modalConfig.isOpen = false"
    />

    <!-- Top Toolbar -->
    <div class="h-16 border-b border-stone-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md z-10 shrink-0">
      <div class="flex items-center gap-3">
        <button @click="handleBack" class="p-2 hover:bg-stone-100 rounded-full text-gray-500 transition-colors">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex flex-col">
          <div class="text-xs text-gray-400 font-medium uppercase tracking-widest flex items-center gap-2">
            <span>DeepFlow 编辑器</span>
            <div class="flex items-center gap-1 ml-2 px-2 py-0.5 bg-stone-50 rounded-full border border-stone-100" :title="isGhostLoading ? 'AI 思考中...' : ghostSuggestions.length > 0 ? '补全就绪' : 'AI 待机'">
              <Zap class="w-3 h-3" :class="aiStatusColor" fill="currentColor" />
              <span class="text-[10px] text-gray-400">
                {{ isGhostLoading ? "Thinking" : ghostSuggestions.length > 0 ? "Ready" : "Idle" }}
              </span>
            </div>
          </div>
          <span v-if="lastSaved" class="text-[10px] text-gray-300">上次保存: {{ new Date(lastSaved).toLocaleTimeString() }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Version History -->
        <div class="relative">
          <button 
            @click="showVersions = !showVersions"
            :class="['p-2 rounded-full transition-colors', showVersions ? 'bg-stone-200 text-gray-800' : 'text-gray-400 hover:bg-stone-100 hover:text-gray-600']"
            title="历史版本"
          >
            <History class="w-[18px] h-[18px]" />
          </button>
          
          <div v-if="showVersions" class="absolute top-10 right-0 w-64 bg-white rounded-xl shadow-xl border border-stone-200 p-2 z-50 animate-fade-in max-h-80 overflow-y-auto">
            <h4 class="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">版本历史</h4>
            <div v-if="versions.length > 0">
              <div v-for="(v, idx) in versions" :key="idx" class="flex items-center justify-between p-2 hover:bg-stone-50 rounded-lg group">
                <div class="flex flex-col overflow-hidden">
                  <span class="text-sm font-medium text-gray-700">{{ new Date(v.timestamp).toLocaleTimeString() }}</span>
                  <span class="text-xs text-gray-400 truncate">{{ v.note || new Date(v.timestamp).toLocaleDateString() }}</span>
                </div>
                <button 
                  @click="requestRestoreVersion(v)"
                  class="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="恢复此版本"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div v-else class="text-center py-4 text-xs text-gray-400">暂无历史版本</div>
          </div>
        </div>

        <button 
          @click="handleExportMarkdown"
          class="p-2 text-gray-400 hover:bg-stone-100 hover:text-gray-600 rounded-full transition-colors"
          title="导出为 Markdown"
        >
          <Download class="w-[18px] h-[18px]" />
        </button>

        <div class="h-6 w-px bg-stone-200 mx-2"></div>

        <button 
          @click="handleAnalyzeStructure"
          :disabled="!content || content.length < 5"
          :class="['flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all', showTips ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-stone-100 text-gray-600', (!content || content.length < 5) ? 'opacity-50 cursor-not-allowed' : '']"
          title="AI 智能优化"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': analysisStatus === AIStatus.LOADING }" />
          <span class="hidden sm:inline">优化建议</span>
        </button>
        
        <button 
          @click="handleSave(true)" 
          class="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm hover:shadow"
        >
          <Save class="w-[18px] h-[18px]" />
          <span class="hidden sm:inline">保存</span>
        </button>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- Main Writing Area -->
      <div class="flex-1 overflow-y-auto relative bg-paper" id="editor-container">
        <div class="max-w-3xl mx-auto px-8 py-12 min-h-full relative">
          
          <!-- Topic Display -->
          <div v-if="topic" class="mb-8 relative group">
            <div class="p-4 bg-stone-50 border-l-4 border-orange-400 rounded-r-lg text-sm text-gray-600 flex items-start justify-between">
              <div>
                <span class="font-bold text-gray-800 block mb-1">思考命题:</span>
                {{ topic }}
              </div>
              <button 
                v-if="topicDescription"
                @click="showTopicDetail = !showTopicDetail"
                class="p-1 hover:bg-stone-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
                title="查看命题详情"
              >
                <Brain class="w-4 h-4" />
              </button>
            </div>
            
            <div v-if="showTopicDetail && topicDescription" class="mt-2 p-4 bg-white border border-stone-200 shadow-lg rounded-lg text-gray-700 text-sm leading-relaxed animate-fade-in relative z-20">
              <h4 class="font-bold mb-2 text-gray-900">命题背景</h4>
              {{ topicDescription }}
              <button 
                @click="showTopicDetail = false"
                class="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <input
            type="text"
            v-model="title"
            placeholder="无标题"
            class="w-full text-4xl font-serif font-bold text-ink bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-300 mb-6"
          />
          
          <div class="relative w-full">
            <!-- Ghost Text Overlay -->
            <div 
              ref="overlayRef"
              class="absolute top-0 left-0 w-full h-[calc(100vh-300px)] text-lg leading-relaxed font-serif p-0 pointer-events-none whitespace-pre-wrap overflow-hidden"
              style="color: transparent; z-index: 0;"
              aria-hidden="true"
            >
              {{ content }}<span :class="['text-gray-400 opacity-60 bg-indigo-50/50 rounded-sm transition-opacity', isGhostLoading ? 'animate-pulse' : '']">{{ ghostText }}</span>
            </div>

            <!-- Textarea -->
            <textarea
              ref="textareaRef"
              v-model="content"
              @select="handleSelect"
              @click="checkSelection"
              @keyup="checkSelection"
              @scroll="handleScroll"
              @keydown="handleKeyDown"
              placeholder="在此处开始你的深度思考..."
              class="w-full h-[calc(100vh-300px)] resize-none bg-transparent text-lg leading-relaxed font-serif text-gray-800 focus:outline-none focus:ring-0 p-0 placeholder-gray-300 relative z-10"
              spellcheck="false"
            ></textarea>

            <!-- Polishing Button (Follows Cursor) -->
            <div 
              v-if="showPolishingButton && popupPosition"
              class="absolute z-20 animate-fade-in"
              :style="{ top: popupPosition.top + 'px', left: popupPosition.left + 'px' }"
            >
              <button 
                @click="triggerPolishing"
                class="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105"
              >
                <Wand2 class="w-3.5 h-3.5" />
                <span class="text-xs font-bold">AI 优化</span>
              </button>
            </div>

            <!-- Options Menu (Full Width) -->
            <div 
              v-if="(!showPolishingButton && (polishingOptions.length > 0 || polishingLoading)) && popupPosition"
              class="absolute z-20 animate-fade-in left-0 w-full"
              :style="{ top: popupPosition.top + 'px' }"
            >
              <div class="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-100 p-2 overflow-hidden w-full">
                <div class="px-3 py-1 flex items-center justify-between border-b border-stone-100 mb-1">
                  <span class="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                    <Wand2 class="w-3 h-3"/>
                    AI 润色建议
                  </span>
                  <button 
                    @click="() => { polishingOptions = []; selectedText = ''; polishingLoading = false; popupPosition = null; showPolishingButton = false; }"
                    class="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div v-if="polishingLoading" class="px-4 py-4 flex items-center justify-center gap-3 text-sm text-gray-500">
                  <RefreshCw class="animate-spin text-indigo-500 w-4 h-4" /> 
                  正在思考优化方案...
                </div>
                
                <div v-else class="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                  <button
                    v-for="(opt, idx) in polishingOptions"
                    :key="idx"
                    @click="applyPolishing(opt.text)"
                    class="text-left w-full px-4 py-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-900 text-gray-700 transition-all border border-transparent hover:border-indigo-100 group flex flex-col"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded opacity-80 group-hover:bg-white">{{ opt.label }}</span>
                      <span v-if="opt.description" class="text-xs text-gray-400 group-hover:text-indigo-400">{{ opt.description }}</span>
                    </div>
                    <div class="text-base font-medium leading-relaxed font-serif">{{ opt.text }}</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Empty State Hint -->
          <div v-if="!content && !ghostText" class="mt-12 text-center text-gray-300 pointer-events-none">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-50 text-sm">
              停顿自动补全 • Tab 确认 • Alt+←/→ 切换建议 • 划词优化
            </div>
          </div>
          
          <!-- Ghost Text Nav Hint -->
          <div v-if="ghostSuggestions.length > 1" class="fixed bottom-6 right-8 bg-black/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur animate-fade-in z-40 flex items-center gap-2">
            <span>{{ ghostIndex + 1 }}/{{ ghostSuggestions.length }}</span>
            <div class="h-3 w-px bg-white/20"></div>
            <span>Alt + ← / → 切换</span>
          </div>
        </div>
      </div>

      <!-- Structure Sidebar -->
      <div v-if="showTips" class="w-[450px] bg-stone-50 border-l border-stone-200 overflow-y-auto shadow-2xl relative transition-transform duration-300 ease-in-out z-20">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6 sticky top-0 bg-stone-50 pb-4 border-b border-stone-200 z-10">
            <h3 class="font-bold text-gray-800 flex items-center gap-2 text-lg">
              <Brain class="w-5 h-5 text-indigo-600" />
              AI 智能优化
            </h3>
            <button @click="showTips = false" class="text-gray-400 hover:text-gray-600 bg-stone-100 p-1 rounded-full">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div v-if="analysisStatus === AIStatus.LOADING" class="space-y-6 animate-pulse mt-10">
            <div class="flex items-center gap-2 justify-center text-indigo-500 mb-6">
              <RefreshCw class="animate-spin w-4 h-4" /> 正在深度分析文风...
            </div>
            <div class="h-4 bg-stone-200 rounded w-3/4 mx-auto"></div>
            <div class="h-40 bg-white rounded-xl shadow-sm border border-stone-200"></div>
            <div class="h-40 bg-white rounded-xl shadow-sm border border-stone-200"></div>
          </div>

          <div v-else class="space-y-8 pb-10">
            <p class="text-sm text-gray-500 mb-4 bg-yellow-50 text-yellow-800 p-3 rounded-lg border border-yellow-100">
              AI 提供了 5 个不同维度的优化版本。应用后，<strong>原文将自动保存到历史版本中</strong>。
            </p>
            <div v-if="structuralTips.length > 0">
              <div v-for="(tip, idx) in structuralTips" :key="idx" class="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
                <div class="bg-stone-100 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                  <h4 class="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
                    {{ tip.styleName }}
                  </h4>
                  <span class="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border border-stone-200 truncate max-w-[200px]" :title="tip.explanation">
                    {{ tip.explanation }}
                  </span>
                </div>
                <div class="p-4">
                  <p class="text-sm text-gray-700 leading-relaxed font-serif whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar mb-4 bg-stone-50 p-3 rounded border border-stone-100">
                    {{ tip.rewrittenContent }}
                  </p>
                  <button 
                    @click="requestApplyRewrite(tip.rewrittenContent, tip.styleName)"
                    class="w-full py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <RefreshCw class="w-3.5 h-3.5" /> 
                    应用此版本 (并备份原文)
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="p-4 text-center text-gray-500 text-sm">
              暂时无法生成结构建议，请稍后再试。
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
