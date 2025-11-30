<script setup lang="ts">
import { ref } from 'vue';
import { X, Save } from 'lucide-vue-next';
import { getAISettings, saveAISettings } from '@/services/storage';
import type { AISettings, AIProvider } from '@/types';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const settings = ref<AISettings>(getAISettings());

const handleSave = () => {
  saveAISettings(settings.value);
  emit('close');
  // Reload page to apply settings? Or just let services read from storage.
  // Services read from storage on every call, so it's fine.
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4 text-ink">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold font-serif text-gray-900">设置</h2>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-600">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            AI 提供商
          </label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                v-model="settings.provider" 
                value="gemini"
                class="text-blue-600 focus:ring-blue-500"
              />
              <span class="text-gray-800">Google Gemini</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                v-model="settings.provider" 
                value="openai"
                class="text-blue-600 focus:ring-blue-500"
              />
              <span class="text-gray-800">OpenAI Compatible</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <input 
            v-model="settings.apiKey"
            type="password"
            placeholder="sk-..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900"
          />
          <p class="text-xs text-gray-500 mt-1">
            Key 仅存储在本地浏览器中，不会上传到服务器。
          </p>
        </div>

        <div v-if="settings.provider === 'openai'">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Base URL (可选)
          </label>
          <input 
            v-model="settings.baseUrl"
            type="text"
            placeholder="https://api.openai.com/v1"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            模型名称
          </label>
          <input 
            v-model="settings.modelName"
            type="text"
            placeholder="gemini-2.5-flash / gpt-4o"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-gray-900"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            幽灵文字生成延迟 ({{ settings.ghostDelay || 1000 }}ms)
          </label>
          <input 
            v-model.number="settings.ghostDelay"
            type="range"
            min="500"
            max="5000"
            step="100"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>快 (0.5s)</span>
            <span>慢 (5s)</span>
          </div>
        </div>
      </div>

      <div class="mt-8 flex justify-end">
        <button 
          @click="handleSave"
          class="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
        >
          <Save class="w-4 h-4" />
          保存设置
        </button>
      </div>
    </div>
  </div>
</template>
