import { ref, watch } from 'vue';
import { generateText, parseAsArray } from '@/services/geminiService';
import { PROMPTS } from '@/config/appConfig';

export function useGhostText(content: any) {
  const suggestions = ref<string[]>([]);
  const index = ref(0);
  const isLoading = ref(false);
  const ghostText = ref('');
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Watch for suggestions changes to update the current ghost text
  watch([suggestions, index], () => {
    if (suggestions.value.length > 0) {
      ghostText.value = suggestions.value[index.value] || '';
    } else {
      ghostText.value = '';
    }
  });

  const trigger = async (currentContent: string) => {
    // Basic validation: only trigger if content is long enough
    if (currentContent.length < 5) return;

    isLoading.value = true;
    try {
      const prompt = PROMPTS.GHOST_TEXT.userTemplate(currentContent);
      const response = await generateText(PROMPTS.GHOST_TEXT.system, prompt, true);
      const result = parseAsArray<string>(response);
      
      if (result && result.length > 0) {
        suggestions.value = result;
        index.value = 0;
      }
    } catch (error) {
      console.error('Ghost Text Error:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const debouncedTrigger = (currentContent: string) => {
    suggestions.value = []; // Clear immediately on type
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      trigger(currentContent);
    }, 1000);
  };

  const accept = () => {
    const text = ghostText.value;
    suggestions.value = [];
    ghostText.value = '';
    return text;
  };

  const cycle = () => {
    if (suggestions.value.length > 1) {
      index.value = (index.value + 1) % suggestions.value.length;
    }
  };

  return {
    ghostText,
    suggestions,
    isLoading,
    debouncedTrigger,
    accept,
    cycle
  };
}
