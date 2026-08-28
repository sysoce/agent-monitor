import type { AppState } from '../types';
import { escapeHtml } from './markdown';
import { renderAttachmentPill } from './attachmentPill';
import { renderMentionDropdown } from './mentionDropdown';
import { renderModelPickerDropdown } from './modelPickerDropdown';
import { formatModelLabel } from '../../utils/modelCatalogPresets';
import { isComposerStopMode } from '../composerButton';

export function renderComposerView(state: AppState): string {
  if (state.activeTab === 'plans') return '';

  const modeLabel = state.composerMode === 'agent' ? 'Agent' : state.composerMode === 'plan' ? 'Plan' : 'Ask';
  const modelLabel = formatModelLabel(state.selectedModel, state.availableModels);
  const stopMode = isComposerStopMode(state);
  const attachments = state.attachments || [];

  return `
    <footer class="app-composer composer">
      <input type="file" id="attach-file-input" style="display:none" multiple>
      <div class="composer-card composer-inner">
        <div id="mention-dropdown-container">
          ${state.isMentionOpen ? renderMentionDropdown(state.mentionSuggestions || [], state.activeMentionIndex || 0) : ''}
        </div>
        ${
          attachments.length > 0
            ? `<div class="composer-attachments attachment-list" id="composer-attachments">${attachments.map((a) => renderAttachmentPill(a, true)).join('')}</div>`
            : ''
        }
        <textarea
          id="composer-input"
          class="composer-textarea composer-input"
          placeholder="Message or instruction... (@ for context)"
          rows="1"
        >${escapeHtml(state.composerDraft || '')}</textarea>
        <div class="composer-toolbar">
          <div class="composer-toolbar-left mode-selectors">
            <button type="button" class="icon-btn composer-icon-btn" id="btn-mention-trigger" title="Attach files or context (@)" aria-label="Attach files or context">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M4.5 3a2.5 2.5 0 0 1 5 0v6.5a1.5 1.5 0 0 1-3 0V4a.5.5 0 0 1 1 0v5.5a.5.5 0 0 0 1 0V3a1.5 1.5 0 0 0-3 0v6.5a2.5 2.5 0 0 0 5 0V3a.5.5 0 0 1 1 0v6.5a3.5 3.5 0 0 1-7 0V3z"/>
              </svg>
            </button>
            <button type="button" class="composer-pill mode-picker-btn mode-pill mode-pill--${state.composerMode}" id="btn-mode-toggle" title="Switch Mode">
              <span class="mode-dot"></span>
              <span class="mode-text" id="composer-mode-text">${modeLabel}</span>
              <svg class="mode-picker-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="model-picker-wrapper mode-select">
              <button type="button" class="composer-pill model-picker-btn" id="btn-model-toggle" title="Select Model" aria-expanded="${state.isModelPickerOpen ? 'true' : 'false'}">
                <span class="model-text" id="composer-model-text">${escapeHtml(modelLabel)}</span>
                <svg class="mode-picker-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              ${state.isModelPickerOpen ? renderModelPickerDropdown(state) : ''}
            </div>
          </div>
          <div class="composer-toolbar-right composer-actions">
            <button
              type="button"
              class="send-btn ${stopMode ? 'btn-stop stop-mode' : 'btn-send'}"
              id="${stopMode ? 'btn-stop' : 'btn-send'}"
              title="${stopMode ? 'Stop (Immediate stop)' : 'Send (Enter)'}"
              aria-label="${stopMode ? 'Stop agent' : 'Send message'}"
            >
              <svg class="submit-icon send-icon ${stopMode ? 'hidden' : ''}" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 12V4M8 4L5 7M8 4l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg class="submit-icon stop-icon ${stopMode ? '' : 'hidden'}" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <rect x="4.5" y="4.5" width="7" height="7" rx="1.5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  `;
}
