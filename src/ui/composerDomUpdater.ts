import type { AppState } from './types';
import { renderAttachmentPill } from './components/attachmentPill';
import { renderMentionDropdown } from './components/mentionDropdown';
import { renderModelPickerDropdown } from './components/modelPickerDropdown';
import { formatModelLabel } from '../utils/modelCatalogPresets';
import { updateComposerButton } from './composerButton';

export function updateComposerDOM(state: AppState, composerEl: HTMLElement): void {
  const modeLabel = state.composerMode === 'agent' ? 'Agent' : state.composerMode === 'plan' ? 'Plan' : 'Ask';
  const modelLabel = formatModelLabel(state.selectedModel, state.availableModels);

  const mentionContainer = composerEl.querySelector('#mention-dropdown-container');
  if (mentionContainer) {
    const nextMentionHtml = state.isMentionOpen
      ? renderMentionDropdown(state.mentionSuggestions || [], state.activeMentionIndex || 0)
      : '';
    if (mentionContainer.innerHTML !== nextMentionHtml) {
      mentionContainer.innerHTML = nextMentionHtml;
    }
  }

  const attachments = state.attachments || [];
  const attContainer = composerEl.querySelector('#composer-attachments');
  if (attachments.length > 0) {
    const nextAttHtml = attachments.map((a) => renderAttachmentPill(a, true)).join('');
    if (!attContainer) {
      const input = composerEl.querySelector('#composer-input');
      if (input && typeof input.insertAdjacentHTML === 'function') {
        input.insertAdjacentHTML(
          'beforebegin',
          `<div class="composer-attachments attachment-list" id="composer-attachments">${nextAttHtml}</div>`
        );
      }
    } else if (attContainer.innerHTML !== nextAttHtml) {
      attContainer.innerHTML = nextAttHtml;
    }
  } else if (attContainer && typeof attContainer.remove === 'function') {
    attContainer.remove();
  }

  const modeBtn = composerEl.querySelector('#btn-mode-toggle');
  if (modeBtn) {
    modeBtn.className = `composer-pill mode-picker-btn mode-pill mode-pill--${state.composerMode}`;
    const modeText = modeBtn.querySelector('#composer-mode-text');
    if (modeText && modeText.textContent !== modeLabel) {
      modeText.textContent = modeLabel;
    }
  }

  const modelWrapper = composerEl.querySelector('.model-picker-wrapper');
  if (modelWrapper) {
    const modelText = modelWrapper.querySelector('#composer-model-text');
    if (modelText && modelText.textContent !== modelLabel) {
      modelText.textContent = modelLabel;
    }
    const modelBtn = modelWrapper.querySelector<HTMLButtonElement>('#btn-model-toggle');
    if (modelBtn && typeof modelBtn.setAttribute === 'function') {
      modelBtn.setAttribute('aria-expanded', state.isModelPickerOpen ? 'true' : 'false');
    }
    const existingDropdown = modelWrapper.querySelector('.model-picker-dropdown');
    if (state.isModelPickerOpen) {
      const dropdownHtml = renderModelPickerDropdown(state);
      if (existingDropdown) {
        existingDropdown.outerHTML = dropdownHtml;
      } else if (typeof modelWrapper.insertAdjacentHTML === 'function') {
        modelWrapper.insertAdjacentHTML('beforeend', dropdownHtml);
      }
    } else if (existingDropdown && typeof existingDropdown.remove === 'function') {
      existingDropdown.remove();
    }
  }

  const composerInput = composerEl.querySelector<HTMLTextAreaElement>('#composer-input');
  if (composerInput && typeof document !== 'undefined' && document.activeElement !== composerInput) {
    const expected = state.composerDraft || '';
    if (composerInput.value !== expected) {
      composerInput.value = expected;
    }
  }

  updateComposerButton(state, composerEl as any);
}
