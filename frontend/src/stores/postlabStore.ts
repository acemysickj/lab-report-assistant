import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReportBlock } from '../utils/blocksToHtml';

export type PostlabPhase = 'data_entry' | 'analysis' | 'figures' | 'content_gen' | 'review_export' | 'done';

export const POSTLAB_SECTIONS = [
  { key: 'records', label: '实验记录' },
  { key: 'discussion', label: '结果讨论' },
  { key: 'questions', label: '思考题' },
] as const;

interface PostlabState {
  phase: PostlabPhase;
  currentStep: number;
  rawData: Record<string, unknown>;
  temperature?: number;
  pressure?: number;
  analysisRes: Record<string, unknown>;
  figures: string[];
  figureDir: string;
  sectionContents: Record<string, ReportBlock[]>;
  generatedContent: string;
  revisedContent: string;
  activeSection: string;
  feedback: string;
  error: string | null;

  setPhase: (p: PostlabPhase) => void;
  setStep: (n: number) => void;
  setRawData: (d: Record<string, unknown>, temp?: number, pres?: number) => void;
  setAnalysisRes: (r: Record<string, unknown>) => void;
  setFigures: (figs: string[], dir: string) => void;
  setActiveSection: (s: string) => void;
  startGenerate: () => void;
  finishGenerate: (content: string) => void;
  startRevise: () => void;
  finishRevise: (content: string) => void;
  acceptSection: () => void;
  finishAssemble: () => void;
  setError: (e: string | null) => void;
  setFeedback: (t: string) => void;
  restore: (d: any) => void;
  clearAll: () => void;
}

const initial = {
  phase: 'data_entry' as PostlabPhase,
  currentStep: 0,
  rawData: {} as Record<string, unknown>,
  temperature: undefined as number | undefined,
  pressure: undefined as number | undefined,
  analysisRes: {} as Record<string, unknown>,
  figures: [] as string[],
  figureDir: '',
  sectionContents: {} as Record<string, ReportBlock[]>,
  generatedContent: '',
  revisedContent: '',
  activeSection: 'records',
  feedback: '',
  error: null as string | null,
};

export const usePostlabStore = create<PostlabState>()(
  persist(
    (set, get) => ({
      ...initial,

      setPhase: (p) => set({ phase: p }),
      setStep: (n) => set({ currentStep: n }),

      setRawData: (d, temp, pres) => set({ rawData: d, temperature: temp, pressure: pres, phase: 'analysis' }),

      setAnalysisRes: (r) => set({ analysisRes: r, phase: 'figures' }),

      setFigures: (figs, dir) => set({ figures: figs, figureDir: dir, phase: 'content_gen' }),

      setActiveSection: (s) => set({ activeSection: s }),

      startGenerate: () => set({ generatedContent: '', revisedContent: '', error: null }),

      finishGenerate: (c) => set({ generatedContent: c }),

      startRevise: () => set({ revisedContent: '' }),

      finishRevise: (c) => set({ revisedContent: c }),

      acceptSection: () => {
        const { generatedContent, revisedContent, activeSection, sectionContents } = get();
        const raw = revisedContent || generatedContent;
        let blocks: ReportBlock[] = [];
        try {
          const parsed = JSON.parse(raw.trim());
          blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
        } catch { /* ignore */ }
        if (!blocks.length) { set({ error: '未能解析生成内容' }); return; }
        const next = { ...sectionContents, [activeSection]: blocks };
        const allDone = POSTLAB_SECTIONS.every((s) => next[s.key]);
        set({
          sectionContents: next, generatedContent: '', revisedContent: '', feedback: '', error: null,
          phase: allDone ? 'review_export' : 'content_gen', currentStep: allDone ? 4 : 3,
        });
      },

      finishAssemble: () => set({ phase: 'done' }),

      setError: (e) => set({ error: e }),
      setFeedback: (t) => set({ feedback: t }),

      restore: (d) => set({
        rawData: d.rawData || {}, temperature: d.temperature, pressure: d.pressure,
        analysisRes: d.analysisRes || {}, sectionContents: d.sectionContents || {},
        phase: d.phase || 'data_entry', currentStep: d.currentStep || 0, activeSection: d.activeSection || 'records',
      }),

      clearAll: () => set({ ...initial }),
    }),
    {
      name: 'postlab-flow',
      partialize: (s) => ({
        rawData: s.rawData, temperature: s.temperature, pressure: s.pressure,
        analysisRes: s.analysisRes, sectionContents: s.sectionContents,
        phase: s.phase, currentStep: s.currentStep,
      }),
    },
  ),
);
