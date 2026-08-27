import type { AppState } from './types';

export interface ComposerKeyCallbacks {
  onSendMessage: () => Promise<void> | void;
}

export function handleComposerKeydown(
  e: KeyboardEvent,
  state: AppState,
  callbacks: ComposerKeyCallbacks
): boolean {
  if (e.key !== 'Enter') return false;
  if (e.isComposing || (e as any).keyCode === 229) return false;

  if (e.metaKey || e.ctrlKey) {
    e.preventDefault();
    void callbacks.onSendMessage();
    return true;
  }

  if (e.shiftKey) return false;
  if (state.isMentionOpen) return false;

  e.preventDefault();
  void callbacks.onSendMessage();
  return true;
}

export function autoResizeTextarea(textarea: HTMLTextAreaElement, maxHeight = 180): void {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const newHeight = Math.min(textarea.scrollHeight, maxHeight);
  if (newHeight > 0) {
    textarea.style.height = `${newHeight}px`;
  }
}
