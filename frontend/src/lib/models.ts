import type { ModelSettings } from './types';

// Spiegelt functions/src/_shared/models.ts — Defaults + auswählbare Modelle.
export const DEFAULT_MODELS: ModelSettings = {
  extract: 'google/gemini-2.5-flash',
  vision: 'google/gemini-2.5-flash',
  nutrition: 'google/gemini-2.5-flash',
  adjust: 'anthropic/claude-sonnet-4',
  review: 'anthropic/claude-sonnet-4',
};

export interface ModelOption {
  id: string;
  label: string;
  free?: boolean;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (schnell/günstig, vision)' },
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (sehr günstig)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (vision)' },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3 (günstig/gut)' },
  { id: 'minimax/minimax-m3:free', label: 'MiniMax M3 (kostenlos, vision)', free: true },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (kostenlos, vision)', free: true },
  { id: 'z-ai/glm-5.2:free', label: 'GLM 5.2 (kostenlos)', free: true },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron Super 120B (kostenlos)', free: true },
];

// Tote Modell-Slugs (vom Anbieter entfernt) aus gespeicherten Settings rausfiltern → Default.
export function sanitizeSettings(settings?: Partial<ModelSettings>): ModelSettings {
  const valid = new Set(MODEL_OPTIONS.map((m) => m.id));
  const out: ModelSettings = { ...DEFAULT_MODELS };
  if (!settings) return out;
  for (const k of Object.keys(out) as (keyof ModelSettings)[]) {
    const v = settings[k];
    if (v && valid.has(v)) out[k] = v;
  }
  return out;
}
