export interface ModelCapabilities {
  thinking?: boolean;
  vision?: boolean;
  tools?: boolean;
  contextWindow?: number;
}

export interface ModelCatalogOption {
  id: string;
  value?: string;
  label: string;
  provider: string;
  category?: string;
  hint?: string;
  badge?: string;
  isDefault?: boolean;
  capabilities?: ModelCapabilities;
  pills?: string[];
}

export interface ModelCatalogGroup {
  label: string;
  category: string;
  options: ModelCatalogOption[];
}

export const ANTIGRAVITY_PRESET_MODELS: ModelCatalogOption[] = [
  { id: 'antigravity|gemini-3.7-flash-high|model', label: 'Gemini 3.7 Flash', provider: 'antigravity', hint: 'Fast / High Quality', isDefault: true, capabilities: { thinking: true, vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'antigravity|gemini-3.6-flash|model', label: 'Gemini 3.6 Flash', provider: 'antigravity', hint: 'Medium Latency', capabilities: { vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'antigravity|gemini-3.5-flash|model', label: 'Gemini 3.5 Flash', provider: 'antigravity', hint: 'Medium Latency', capabilities: { vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'antigravity|gemini-3.1-pro|model', label: 'Gemini 3.1 Pro', provider: 'antigravity', hint: 'Low Latency', capabilities: { vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'antigravity|gemini-2.5-pro|model', label: 'Gemini 2.5 Pro', provider: 'antigravity', hint: 'Deep Reasoning', capabilities: { thinking: true, vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'antigravity|gemini-2.5-flash|model', label: 'Gemini 2.5 Flash', provider: 'antigravity', hint: 'Ultra Fast', capabilities: { vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'antigravity|gemini-3.7-flash-low|model', label: 'Gemini 3.7 Flash (Low Thinking)', provider: 'antigravity', hint: 'Low Latency', capabilities: { thinking: true, vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'antigravity|gemini-2.5-flash-thinking|model', label: 'Gemini 2.5 Flash Thinking', provider: 'antigravity', hint: 'Thinking', capabilities: { thinking: true, vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'antigravity|gemini-3.7-flash-high|sdk', label: 'Google Antigravity SDK Agent', provider: 'antigravity', hint: 'Autonomous SDK', capabilities: { thinking: true, vision: true, tools: true, contextWindow: 1_000_000 } },
];

export const CURSOR_PRESET_MODELS: ModelCatalogOption[] = [
  { id: 'cursor|auto|model', label: 'Cursor Auto', provider: 'cursor', hint: 'Auto Routing', isDefault: true, capabilities: { vision: true, tools: true, contextWindow: 200_000 } },
  { id: 'cursor|composer-2.5|model', label: 'Cursor Composer 2.5', provider: 'cursor', hint: 'Cursor Bridge', capabilities: { vision: true, tools: true, contextWindow: 200_000 } },
  { id: 'cursor|composer-1|model', label: 'Cursor Composer 1', provider: 'cursor', hint: 'Cursor Bridge', capabilities: { vision: true, tools: true, contextWindow: 200_000 } },
];

export const ANTHROPIC_PRESET_MODELS: ModelCatalogOption[] = [
  { id: 'anthropic|claude-3-7-sonnet|model', label: 'Claude 3.7 Sonnet', provider: 'anthropic', hint: 'Hybrid Thinking', capabilities: { thinking: true, vision: true, tools: true, contextWindow: 200_000 } },
  { id: 'anthropic|claude-3-5-sonnet|model', label: 'Claude 3.5 Sonnet', provider: 'anthropic', hint: 'Coding Leader', capabilities: { vision: true, tools: true, contextWindow: 200_000 } },
  { id: 'anthropic|claude-3-5-haiku|model', label: 'Claude 3.5 Haiku', provider: 'anthropic', hint: 'Fast & Precise', capabilities: { vision: true, tools: true, contextWindow: 200_000 } },
  { id: 'anthropic|claude-3-opus|model', label: 'Claude 3 Opus', provider: 'anthropic', hint: 'Deep Analysis', capabilities: { vision: true, tools: true, contextWindow: 200_000 } },
];

export const OPENAI_PRESET_MODELS: ModelCatalogOption[] = [
  { id: 'openai|gpt-4o|model', label: 'OpenAI: GPT-4o', provider: 'openai', hint: 'Omni Multimodal', capabilities: { vision: true, tools: true, contextWindow: 128_000 } },
  { id: 'openai|gpt-4o-mini|model', label: 'OpenAI: GPT-4o Mini', provider: 'openai', hint: 'Fast & Light', capabilities: { vision: true, tools: true, contextWindow: 128_000 } },
  { id: 'openai|o3-mini|model', label: 'OpenAI: o3-mini', provider: 'openai', hint: 'Reasoning', capabilities: { thinking: true, tools: true, contextWindow: 200_000 } },
  { id: 'openai|o1|model', label: 'OpenAI: o1', provider: 'openai', hint: 'Deep Reasoning', capabilities: { thinking: true, vision: true, tools: true, contextWindow: 200_000 } },
  { id: 'openai|gpt-4.5-preview|model', label: 'OpenAI: GPT-4.5 Preview', provider: 'openai', hint: 'Frontier', capabilities: { vision: true, tools: true, contextWindow: 128_000 } },
];

export const GEMINI_PRESET_MODELS: ModelCatalogOption[] = [
  { id: 'gemini|gemini-3.7-flash|model', label: 'Gemini 3.7 Flash', provider: 'gemini', hint: 'Best Free Tier / Hybrid Thinking', isDefault: true, capabilities: { thinking: true, vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'gemini|gemini-3.6-flash|model', label: 'Gemini 3.6 Flash', provider: 'gemini', hint: 'Fast / High Quality', capabilities: { vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'gemini|gemini-2.5-pro|model', label: 'Gemini 2.5 Pro', provider: 'gemini', hint: 'Deep Reasoning', capabilities: { thinking: true, vision: true, tools: true, contextWindow: 1_000_000 } },
  { id: 'gemini|gemini-2.0-flash|model', label: 'Gemini 2.0 Flash', provider: 'gemini', hint: 'Google AI', capabilities: { vision: true, tools: true, contextWindow: 1_000_000 } },
];

export const PUTER_PRESET_MODELS: ModelCatalogOption[] = [
  { id: 'puter|claude-3-7-sonnet|model', label: 'Puter: Claude 3.7 Sonnet', provider: 'puter', hint: 'Puter Free', capabilities: { thinking: true, vision: true, contextWindow: 200_000 } },
  { id: 'puter|claude-3.5-sonnet|model', label: 'Puter: Claude 3.5 Sonnet', provider: 'puter', hint: 'Puter Free', capabilities: { vision: true, contextWindow: 200_000 } },
  { id: 'puter|gpt-4o|model', label: 'Puter: GPT-4o', provider: 'puter', hint: 'Puter Free', capabilities: { vision: true, contextWindow: 128_000 } },
  { id: 'puter|gpt-4o-mini|model', label: 'Puter: GPT-4o Mini', provider: 'puter', hint: 'Puter Free', capabilities: { vision: true, contextWindow: 128_000 } },
  { id: 'puter|gemini-2.5-flash|model', label: 'Puter: Gemini 2.5 Flash', provider: 'puter', hint: 'Puter Free', capabilities: { vision: true, contextWindow: 1_000_000 } },
  { id: 'puter|gemini-2.0-flash|model', label: 'Puter: Gemini 2.0 Flash', provider: 'puter', hint: 'Puter Free', capabilities: { vision: true, contextWindow: 1_000_000 } },
];

export const OLLAMA_DEFAULT_PRESETS: ModelCatalogOption[] = [
  { id: 'ollama|mannix/qwen3.6-27b-a3b-coderx:vision-Q4_K_M|model', label: 'Ollama: Qwen 3.6 27B CoderX Vision (Champion)', provider: 'ollama', hint: 'MoE Champion / 17GB / Multimodal', isDefault: true, capabilities: { tools: true, vision: true, contextWindow: 32_000 } },
  { id: 'ollama|ornith-1.5:9b-aligned|model', label: 'Ollama: Ornith 1.5 9B (Efficiency Champion)', provider: 'ollama', hint: 'Fast Dense / 6.6GB / 100% Industry Parity', capabilities: { thinking: true, tools: true, contextWindow: 32_000 } },
  { id: 'ollama|qwen2.5-coder:7b-aligned|model', label: 'Ollama: Qwen 2.5 Coder 7B (Subagent Explorer)', provider: 'ollama', hint: 'Ultra-Fast Subagent / 4.7GB', capabilities: { tools: true, contextWindow: 32_000 } },
  { id: 'ollama|qwen2.5-coder:14b|model', label: 'Ollama: Qwen 2.5 Coder 14B', provider: 'ollama', hint: 'Fast Dense / 9GB / 32k ctx', capabilities: { tools: true, contextWindow: 32_000 } },
  { id: 'ollama|qwen2.5-coder:32b|model', label: 'Ollama: Qwen 2.5 Coder 32B', provider: 'ollama', hint: 'Dense Specialist / 17GB', capabilities: { tools: true, contextWindow: 32_000 } },
  { id: 'ollama|qwq:32b|model', label: 'Ollama: QwQ 32B Reasoning', provider: 'ollama', hint: 'Deep Reasoning / 19GB', capabilities: { thinking: true, tools: true, contextWindow: 32_000 } },
  { id: 'ollama|deepseek-r1:14b|model', label: 'Ollama: DeepSeek R1 14B', provider: 'ollama', hint: 'Fast Reasoning / 9GB', capabilities: { thinking: true, contextWindow: 8_192 } },
  { id: 'ollama|devstral-small-2:24b|model', label: 'Ollama: Devstral 24B', provider: 'ollama', hint: 'Mistral Coder / 15GB', capabilities: { tools: true, contextWindow: 32_000 } },
];

export const LMSTUDIO_DEFAULT_PRESETS: ModelCatalogOption[] = [
  { id: 'lmstudio|local-model|model', label: 'LM Studio: local-model', provider: 'lmstudio', hint: 'Local (1234)', capabilities: { tools: true, contextWindow: 8_192 } },
  { id: 'lmstudio|deepseek-r1-distill-qwen-14b|model', label: 'LM Studio: DeepSeek R1 14B', provider: 'lmstudio', hint: 'Local', capabilities: { thinking: true, contextWindow: 8_192 } },
  { id: 'lmstudio|qwen2.5-coder-7b-instruct|model', label: 'LM Studio: Qwen 2.5 Coder 7B', provider: 'lmstudio', hint: 'Local', capabilities: { tools: true, contextWindow: 8_192 } },
];

export function formatModelLabel(modelId?: string, availableModels?: ModelCatalogOption[]): string {
  if (!modelId) return 'Gemini 3.7 Flash';
  const match = availableModels?.find((m) => m.id === modelId || m.value === modelId);
  if (match?.label) return match.label;

  const parts = modelId.split('|');
  const provider = parts[0];
  const modelName = parts[1] || modelId;

  if (provider === 'antigravity') {
    if (modelName.includes('3.7')) return 'Gemini 3.7 Flash';
    if (modelName.includes('pro')) return 'Gemini 2.5 Pro';
    if (modelName.includes('flash')) return 'Gemini 2.5 Flash';
    return modelName;
  }
  if (provider === 'cursor') {
    if (modelName === 'auto' || modelName === 'default') return 'Cursor Auto';
    if (modelName === 'composer-2.5') return 'Cursor Composer 2.5';
    if (modelName === 'composer-1') return 'Cursor Composer 1';
    return `Cursor: ${modelName}`;
  }
  if (provider === 'anthropic') {
    if (modelName.includes('3-7') || modelName.includes('3.7')) return 'Claude 3.7 Sonnet';
    if (modelName.includes('3-5-sonnet') || modelName.includes('3.5-sonnet')) return 'Claude 3.5 Sonnet';
    if (modelName.includes('haiku')) return 'Claude 3.5 Haiku';
    if (modelName.includes('opus')) return 'Claude Opus';
    return modelName;
  }
  if (provider === 'openai') {
    if (modelName.includes('4o-mini')) return 'OpenAI: GPT-4o Mini';
    if (modelName.includes('4o')) return 'OpenAI: GPT-4o';
    if (modelName.includes('o3-mini')) return 'OpenAI: o3-mini';
    if (modelName.includes('o1')) return 'OpenAI: o1';
    return `OpenAI: ${modelName}`;
  }
  if (['gemini', 'puter', 'ollama', 'lmstudio'].includes(provider)) {
    return `${provider.charAt(0).toUpperCase() + provider.slice(1)}: ${modelName}`;
  }
  return modelName;
}
