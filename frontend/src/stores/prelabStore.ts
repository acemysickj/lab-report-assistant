import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReportBlock } from '../utils/blocksToHtml';

export type PrelabPhase = 'idle' | 'generating' | 'review' | 'editing' | 'assembling' | 'done';

const PRELAB_SECTIONS = ['purpose', 'principle', 'equipment', 'procedure'] as const;

interface PrelabState {
  phase: PrelabPhase;
  currentStep: number;
  sections: Record<string, ReportBlock[]>;
  generatedContent: string;
  revisedContent: string;
  error: string | null;
  feedback: string;

  startGenerate: () => void;
  finishGenerate: (content: string) => void;
  startRevise: () => void;
  finishRevise: (content: string) => void;
  startEdit: () => void;
  cancelEdit: () => void;
  acceptSection: () => void;
  finishAssemble: () => void;
  resetError: () => void;
  setError: (msg: string) => void;
  setFeedback: (text: string) => void;
  restore: (data: { sections: Record<string, ReportBlock[]>; currentStep: number }) => void;
  clearAll: () => void;
}

const initialState = {
  phase: 'idle' as PrelabPhase,
  currentStep: 0,
  sections: {} as Record<string, ReportBlock[]>,
  generatedContent: '',
  revisedContent: '',
  error: null as string | null,
  feedback: '',
};

export const usePrelabStore = create<PrelabState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startGenerate: () => set({ phase: 'generating', generatedContent: '', revisedContent: '', error: null }),

      finishGenerate: (content: string) => set({ phase: 'review', generatedContent: content }),

      startRevise: () => set({ phase: 'generating', revisedContent: '' }),

      finishRevise: (content: string) => set({ phase: 'review', revisedContent: content }),

      startEdit: () => set({ phase: 'editing' }),

      cancelEdit: () => set({ phase: 'review' }),

      acceptSection: () => {
        const { generatedContent, revisedContent, currentStep, sections } = get();
        const raw = revisedContent || generatedContent;
        console.log('[prelabStore] acceptSection called. raw length:', raw.length, 'raw[:200]:', raw.slice(0, 200));
        let blocks: ReportBlock[] = [];
        try {
          const parsed = JSON.parse(raw.trim());
          blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
          console.log('[prelabStore] parsed, blocks count:', blocks.length);
        } catch (e) {
          console.log('[prelabStore] JSON parse failed:', e);
        }
        if (!blocks.length) { set({ error: '未能解析生成内容，请重新生成' }); return; }

        const section = PRELAB_SECTIONS[currentStep];
        const newSections = { ...sections, [section]: blocks };

        if (currentStep < PRELAB_SECTIONS.length - 1) {
          set({ sections: newSections, currentStep: currentStep + 1, phase: 'idle', generatedContent: '', revisedContent: '', error: null, feedback: '' });
        } else {
          set({ sections: newSections, phase: 'assembling' });
        }
      },

      finishAssemble: () => set({ phase: 'done' }),

      resetError: () => set({ error: null }),

      setError: (msg: string) => set({ phase: 'idle', error: msg }),

      setFeedback: (text: string) => set({ feedback: text }),

      restore: (data) => set({ sections: data.sections, currentStep: data.currentStep, phase: 'idle', generatedContent: '', revisedContent: '', error: null }),

      clearAll: () => set({ ...initialState }),
    }),
    {
      name: 'prelab-flow',
      partialize: (state) => ({ sections: state.sections, currentStep: state.currentStep }),
    },
  ),
);
