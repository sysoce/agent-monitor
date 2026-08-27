import type { AppState } from '../types';
import type { ModelOption, ModelGroup } from '../../server/types';
import { MONITOR_MODEL_GROUPS } from '../../server/modelsCatalog';
import { resolveModelPills, renderModelPillsHtml } from '../modelPills';
import { escapeHtml } from './markdown';

export function isModelSelected(modelId?: string, currentModel?: string): boolean {
  if (!modelId || !currentModel) return false;
  return modelId.toLowerCase() === currentModel.toLowerCase();
}

function renderGroupItems(
  group: ModelGroup,
  selectedModel: string,
  filter: string
): { groupHeaderHtml: string; itemsHtml: string } {
  const options = group.options || [];
  const matchingItems = options.filter((item: ModelOption) => {
    const lbl = (item.label || '').toLowerCase();
    const val = (item.id || item.value || '').toLowerCase();
    const hint = (item.hint || item.provider || '').toLowerCase();
    const pills = resolveModelPills(item as any);
    const pillsText = pills.map((p) => p.label).join(' ').toLowerCase();
    return !filter || lbl.includes(filter) || val.includes(filter) || hint.includes(filter) || pillsText.includes(filter);
  });

  if (matchingItems.length === 0) return { groupHeaderHtml: '', itemsHtml: '' };

  const groupHeaderHtml = `<div class="model-menu-group">${escapeHtml(group.label)}</div>`;
  const itemsHtml = matchingItems
    .map((item: ModelOption) => {
      const modelId = item.id || item.value || '';
      const modelLabel = item.label || modelId;
      const badge = item.hint || item.provider;
      const isSelected = isModelSelected(modelId, selectedModel);
      const pills = resolveModelPills(item as any);
      const pillsHtml = renderModelPillsHtml(pills);

      return `
        <button
          type="button"
          class="model-picker-item ${isSelected ? 'selected' : ''}"
          data-model-id="${escapeHtml(modelId)}"
          title="${escapeHtml(modelLabel)}"
          aria-selected="${isSelected ? 'true' : 'false'}"
        >
          <div class="model-item-left">
            <span class="model-item-check">${isSelected ? '✓' : ''}</span>
            <span class="model-item-name">${escapeHtml(modelLabel)}</span>
            ${pillsHtml}
          </div>
          ${badge ? `<span class="model-item-badge">${escapeHtml(badge)}</span>` : ''}
        </button>
      `;
    })
    .join('');

  return { groupHeaderHtml, itemsHtml };
}

export function renderModelPickerDropdown(state: AppState): string {
  const filter = (state.modelSearchQuery || '').toLowerCase().trim();
  const groups: ModelGroup[] = state.modelGroups?.length
    ? state.modelGroups
    : MONITOR_MODEL_GROUPS;

  let totalItemsRendered = 0;
  const groupsHtml = groups
    .map((g) => {
      const { groupHeaderHtml, itemsHtml } = renderGroupItems(g, state.selectedModel, filter);
      if (itemsHtml) {
        totalItemsRendered++;
        return `${groupHeaderHtml}${itemsHtml}`;
      }
      return '';
    })
    .join('');

  const emptyHtml =
    totalItemsRendered === 0
      ? `<div class="model-menu-empty" style="padding: 12px 16px; font-size: 12px; color: var(--cursor-muted, #888); text-align: center;">${
          filter ? 'No matching models found' : 'No models available'
        }</div>`
      : '';

  return `
    <div class="model-picker-menu model-picker-dropdown" id="model-picker-menu">
      <div class="model-menu-search-row">
        <input
          type="text"
          id="model-search-input"
          class="model-menu-search-input"
          placeholder="Search models..."
          value="${escapeHtml(state.modelSearchQuery || '')}"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <div class="model-menu-list model-picker-list" id="model-menu-list">
        ${groupsHtml}${emptyHtml}
      </div>
    </div>
  `;
}
