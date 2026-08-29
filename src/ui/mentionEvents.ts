import type { AppState } from './types';
import type { MentionSuggestionItem } from '../types';
import type { AttachmentItem } from '../types';
import { fetchMentions } from './apiClient';
import { renderMentionDropdown } from './components/mentionDropdown';
import { updateComposerButton } from './composerButton';

function updateMentionPopupDOM(state: AppState, onRender: () => void): void {
  const container = document.getElementById('mention-dropdown-container');
  if (!container) return;
  if (!state.isMentionOpen || !state.mentionSuggestions?.length) { container.innerHTML = ''; return; }
  container.innerHTML = renderMentionDropdown(state.mentionSuggestions, state.activeMentionIndex || 0);
  container.querySelectorAll('.mention-item').forEach((el) => {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const idx = Number(el.getAttribute('data-mention-index'));
      const item = state.mentionSuggestions?.[idx];
      if (item) selectMentionItem(state, item, onRender);
    });
  });
}

export function selectMentionItem(state: AppState, item: MentionSuggestionItem, onRender: () => void): void {
  const composer = document.getElementById('composer-input') as HTMLTextAreaElement | null;
  if (composer) {
    const text = composer.value, pos = composer.selectionStart ?? text.length;
    const before = text.slice(0, pos).replace(/(?:^|\s)@[^\s]*$/, ''), after = text.slice(pos);
    composer.value = `${before}${after}`;
    state.composerDraft = composer.value;
    composer.selectionStart = before.length;
    composer.selectionEnd = before.length;
    composer.focus();
  }
  const att: AttachmentItem = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: item.type === 'folder' ? 'directory' : item.type === 'git' ? 'git' : item.type === 'problems' ? 'problems' : 'file',
    label: item.label, path: item.label.replace(/^@/, ''), uri: item.uri,
  };
  state.attachments = [...(state.attachments || []), att];
  state.isMentionOpen = false;
  onRender();
}

async function processFilesToAttachments(state: AppState, files: File[]): Promise<void> {
  for (const file of files) {
    const reader = new FileReader();
    await new Promise<void>((resolve) => {
      reader.onload = () => {
        const isImg = file.type.startsWith('image/');
        state.attachments = [...(state.attachments || []), {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: isImg ? 'image' : 'file',
          label: file.name || (isImg ? 'pasted-image.png' : 'pasted-file'),
          content: typeof reader.result === 'string' ? reader.result : '',
        }];
        resolve();
      };
      if (file.type.startsWith('image/')) reader.readAsDataURL(file);
      else reader.readAsText(file);
    });
  }
}

export function setupMentionInput(state: AppState, onRender: () => void): void {
  const composer = document.getElementById('composer-input') as HTMLTextAreaElement | null;
  if (!composer || composer.dataset.mentionBound) return;
  composer.dataset.mentionBound = 'true';

  const checkMentionQuery = async (): Promise<void> => {
    const text = composer.value, pos = composer.selectionStart ?? text.length;
    const match = text.slice(0, pos).match(/(?:^|\s)@([^\s]*)$/);
    if (match) {
      state.mentionSuggestions = await fetchMentions(match[1] || '');
      state.isMentionOpen = true;
      state.activeMentionIndex = 0;
      updateMentionPopupDOM(state, onRender);
    } else if (state.isMentionOpen) {
      state.isMentionOpen = false;
      updateMentionPopupDOM(state, onRender);
    }
  };

  composer.addEventListener('input', () => { state.composerDraft = composer.value; updateComposerButton(state); void checkMentionQuery(); });
  composer.addEventListener('paste', async (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []).filter((it) => it.kind === 'file');
    const files = items.map((it) => it.getAsFile()).filter((f): f is File => Boolean(f));
    if (files.length > 0) { await processFilesToAttachments(state, files); onRender(); }
  });
  composer.addEventListener('keydown', (e) => {
    if (!state.isMentionOpen || !state.mentionSuggestions?.length) return;
    const total = state.mentionSuggestions.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); state.activeMentionIndex = ((state.activeMentionIndex ?? 0) + 1) % total; updateMentionPopupDOM(state, onRender); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); state.activeMentionIndex = ((state.activeMentionIndex ?? 0) - 1 + total) % total; updateMentionPopupDOM(state, onRender); }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      const item = state.mentionSuggestions[state.activeMentionIndex ?? 0];
      if (item) selectMentionItem(state, item, onRender);
    } else if (e.key === 'Escape') { state.isMentionOpen = false; updateMentionPopupDOM(state, onRender); }
  });
}

export function bindMentionActions(state: AppState, onRender: () => void): void {
  const trigger = document.getElementById('btn-mention-trigger');
  if (trigger && !trigger.dataset.bound) {
    trigger.dataset.bound = 'true';
    trigger.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      (document.getElementById('attach-file-input') as HTMLInputElement | null)?.click();
    });
  }

  const fileInput = document.getElementById('attach-file-input') as HTMLInputElement | null;
  if (fileInput && !fileInput.dataset.bound) {
    fileInput.dataset.bound = 'true';
    fileInput.addEventListener('change', async () => {
      await processFilesToAttachments(state, Array.from(fileInput.files || []));
      fileInput.value = ''; state.isMentionOpen = false; onRender();
    });
  }
}
