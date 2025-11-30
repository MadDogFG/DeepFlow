import { ref } from 'vue';
import { generateText, parseAsArray } from '@/services/geminiService';
import { PROMPTS } from '@/config/appConfig';
import type { CompletionOption } from '@/types';

export function usePolishing() {
  const options = ref<CompletionOption[]>([]);
  const isLoading = ref(false);
  const position = ref<{ top: number; left: number } | null>(null);
  const selectedRange = ref<{ start: number; end: number } | null>(null);
  const selectedText = ref('');

  const trigger = async (text: string, context: string, rect: DOMRect) => {
    if (!text || text.trim().length < 2) {
      clear();
      return;
    }

    // If same text selected, don't re-trigger unless forced (logic handled by caller usually)
    if (text === selectedText.value && options.value.length > 0) return;

    selectedText.value = text;
    // Calculate position relative to viewport or container. 
    // For simplicity, we might pass the calculated top/left directly.
    // Here we assume rect is passed.
    position.value = {
      top: rect.bottom + window.scrollY + 10,
      left: rect.left + window.scrollX
    };

    isLoading.value = true;
    options.value = [];

    try {
      const prompt = PROMPTS.POLISHING.userTemplate(text, context);
      const response = await generateText(PROMPTS.POLISHING.system, prompt, true);
      const result = parseAsArray<CompletionOption>(response);
      options.value = result;
    } catch (error) {
      console.error('Polishing Error:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const clear = () => {
    options.value = [];
    position.value = null;
    selectedRange.value = null;
    selectedText.value = '';
    isLoading.value = false;
  };

  return {
    options,
    isLoading,
    position,
    selectedText,
    trigger,
    clear
  };
}
