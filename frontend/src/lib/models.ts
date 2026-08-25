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
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (kostenlos, vision)', free: true },
  { id: 'meta-llama/llama-4-scout:free', label: 'Llama 4 Scout (kostenlos, vision)', free: true },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (kostenlos)', free: true },
  { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 (kostenlos)', free: true },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (vision)' },
];
