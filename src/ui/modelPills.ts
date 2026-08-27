import type { ModelCatalogOption } from '../utils/modelCatalogPresets';
import { escapeHtml } from './panelDom';
import { openAiCompatibleModelLikelyThinks, modelSupportsImages } from '../utils/visionModels';

export type ModelPillKind = 'reasoning' | 'vision' | 'tools' | 'context' | 'agent' | 'custom';

export interface ModelPill {
  label: string;
  kind: ModelPillKind;
  title?: string;
}

export function formatContextWindow(tokens?: number): string | undefined {
  if (!tokens || tokens <= 0) return undefined;
  if (tokens >= 1_000_000) {
    const m = Math.round((tokens / 1_000_000) * 10) / 10;
    return `${m % 1 === 0 ? m.toFixed(0) : m}M`;
  }
  if (tokens % 1000 === 0) {
    return `${tokens / 1000}k`;
  }
  if (tokens % 1024 === 0) {
    return `${tokens / 1024}k`;
  }
  if (tokens >= 1_000) {
    const k = Math.round(tokens / 1_000);
    return `${k}k`;
  }
  return `${tokens}`;
}

export function resolveModelPills(option: ModelCatalogOption): ModelPill[] {
  if (Array.isArray(option.pills) && option.pills.length > 0) {
    return option.pills.map((label) => ({ label, kind: 'custom' }));
  }

  const pills: ModelPill[] = [];
  const modelId = (option.value || option.id || '').toLowerCase();
  const hintLower = (option.hint || '').toLowerCase();

  const isAgent = modelId.endsWith('|sdk') || hintLower.includes('sdk');
  if (isAgent) {
    pills.push({ label: 'Agent', kind: 'agent', title: 'Autonomous SDK Agent' });
  }

  const isThinking =
    option.capabilities?.thinking ??
    (openAiCompatibleModelLikelyThinks(modelId) ||
      modelId.includes('3.7') ||
      modelId.includes('3-7') ||
      modelId.includes('r1') ||
      modelId.includes('qwq') ||
      hintLower.includes('thinking') ||
      hintLower.includes('reasoning'));

  if (isThinking) {
    pills.push({ label: 'Reasoning', kind: 'reasoning', title: 'Thinking & Deep Reasoning' });
  }

  const isVision =
    option.capabilities?.vision ??
    modelSupportsImages({ provider: option.provider, model: modelId });

  if (isVision) {
    pills.push({ label: 'Vision', kind: 'vision', title: 'Multimodal Vision Support' });
  }

  const isTools =
    option.capabilities?.tools ??
    (option.provider !== 'puter' && option.provider !== 'vscode' && !modelId.includes('r1'));

  if (isTools) {
    pills.push({ label: 'Tools', kind: 'tools', title: 'Native Tool Calling' });
  }

  const ctxLabel = formatContextWindow(option.capabilities?.contextWindow);
  if (ctxLabel) {
    pills.push({ label: ctxLabel, kind: 'context', title: `${ctxLabel} context window` });
  }

  return pills;
}

export function renderModelPillsHtml(pills: ModelPill[]): string {
  if (!pills || pills.length === 0) return '';
  const badges = pills
    .map((p) => {
      const titleAttr = p.title ? ` title="${escapeHtml(p.title)}"` : '';
      return `<span class="model-pill model-pill-${escapeHtml(p.kind)}"${titleAttr}>${escapeHtml(p.label)}</span>`;
    })
    .join('');
  return `<div class="model-item-pills">${badges}</div>`;
}
