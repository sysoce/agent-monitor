import type { ModelOption, ModelGroup } from './types';
import {
  ANTIGRAVITY_PRESET_MODELS,
  CURSOR_PRESET_MODELS,
  ANTHROPIC_PRESET_MODELS,
  OPENAI_PRESET_MODELS,
  GEMINI_PRESET_MODELS,
  PUTER_PRESET_MODELS,
  OLLAMA_DEFAULT_PRESETS,
  LMSTUDIO_DEFAULT_PRESETS,
} from '../utils/modelCatalogPresets';

export const MONITOR_MODEL_GROUPS: ModelGroup[] = [
  { label: 'Google Antigravity', category: 'antigravity', options: ANTIGRAVITY_PRESET_MODELS },
  { label: 'Cursor (IDE Bridge)', category: 'cursor', options: CURSOR_PRESET_MODELS },
  { label: 'Anthropic (Claude)', category: 'anthropic', options: ANTHROPIC_PRESET_MODELS },
  { label: 'OpenAI', category: 'openai', options: OPENAI_PRESET_MODELS },
  { label: 'Google Gemini (API)', category: 'gemini', options: GEMINI_PRESET_MODELS },
  { label: 'Puter.js (Free)', category: 'puter', options: PUTER_PRESET_MODELS },
  { label: 'Local (Ollama)', category: 'ollama', options: OLLAMA_DEFAULT_PRESETS },
  { label: 'Local (LM Studio)', category: 'lmstudio', options: LMSTUDIO_DEFAULT_PRESETS },
];

export const MONITOR_MODEL_PRESETS: ModelOption[] = MONITOR_MODEL_GROUPS.flatMap((g) => g.options);

export function getMonitorModels(): ModelOption[] {
  return MONITOR_MODEL_PRESETS;
}

export function getMonitorModelCatalog(): { groups: ModelGroup[]; models: ModelOption[]; currentProvider: string } {
  return {
    groups: MONITOR_MODEL_GROUPS,
    models: MONITOR_MODEL_PRESETS,
    currentProvider: 'antigravity',
  };
}

