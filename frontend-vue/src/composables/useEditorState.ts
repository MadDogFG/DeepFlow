import { ref, watch } from 'vue';
import type { Essay } from '@/types';
import { essayService } from '@/services/essayService';
import { useRouter } from 'vue-router';

export function useEditorState() {
  const router = useRouter();
  const essay = ref<Essay | null>(null);
  const lastSaved = ref<number | null>(null);
  const isSaving = ref(false);
  const isNew = ref(true);

  const init = async (id?: string) => {
    if (id) {
      try {
        const existing = await essayService.getById(id);
        essay.value = existing;
        isNew.value = false;
      } catch (e) {
        console.error("Failed to load essay", e);
      }
    }
    
    if (!essay.value) {
      essay.value = {
        id: '', // Placeholder, will be set by backend on create
        title: '',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: []
      };
      isNew.value = true;
    }
  };

  const save = async () => {
    if (!essay.value) return;
    
    isSaving.value = true;
    essay.value.updatedAt = new Date().toISOString();
    
    try {
      if (isNew.value) {
        // Create
        const created = await essayService.create(essay.value);
        essay.value = created;
        isNew.value = false;
        // Update URL to include the new ID
        router.replace(`/editor/${created.id}`);
      } else {
        // Update
        await essayService.update(essay.value.id, essay.value);
      }
      lastSaved.value = Date.now();
    } catch (e) {
      console.error("Failed to save", e);
    } finally {
      isSaving.value = false;
    }
  };

  // Auto-save watcher
  watch(() => essay.value?.content, (newVal, oldVal) => {
    if (newVal !== oldVal && !isNew.value) {
      // Only auto-save if it's not a brand new unsaved essay (optional preference)
      // Or we can auto-save new essays too, which creates them.
      // Let's debounce save.
      const timer = setTimeout(() => {
        save();
      }, 2000);
      return () => clearTimeout(timer);
    }
  });

  watch(() => essay.value?.title, () => {
      // Auto save on title change
      if (!isNew.value) save();
  });

  return {
    essay,
    lastSaved,
    isSaving,
    init,
    save
  };
}
