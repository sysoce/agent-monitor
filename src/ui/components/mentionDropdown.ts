import type { MentionSuggestionItem } from '../../types';
import { escapeHtml } from './markdown';

function getMentionIcon(type: string): string {
  switch (type) {
    case 'folder':
      return '📁';
    case 'file':
      return '📄';
    case 'git':
      return '🌿';
    case 'problems':
      return '⚠️';
    default:
      return '📄';
  }
}

export function renderMentionDropdown(
  items: MentionSuggestionItem[],
  activeIndex = 0
): string {
  return `
    <div class="mention-dropdown" id="mention-suggestions-menu">
      <div class="mention-items-list" role="listbox">
        ${
          items.length === 0
            ? `<div class="mention-empty-hint">No matching files or symbols</div>`
            : items
                .map((item, index) => {
                  const icon = getMentionIcon(item.type);
                  const isActive = index === activeIndex;
                  const showDetail = Boolean(item.detail && item.detail !== item.label);
                  return `
                    <div
                      class="mention-item ${isActive ? 'active' : ''}"
                      role="option"
                      data-mention-index="${index}"
                      data-mention-type="${escapeHtml(item.type)}"
                      data-mention-label="${escapeHtml(item.label)}"
                      data-mention-detail="${escapeHtml(item.detail || '')}"
                    >
                      <span class="mention-item-icon">${icon}</span>
                      <div class="mention-item-body">
                        <span class="mention-item-label">${escapeHtml(item.label)}</span>
                        ${showDetail ? `<span class="mention-item-detail">${escapeHtml(item.detail!)}</span>` : ''}
                      </div>
                    </div>
                  `;
                })
                .join('')
        }
      </div>
    </div>
  `;
}
