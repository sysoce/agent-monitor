import type { AppState } from './types';

export function isComposerStopMode(state: AppState, currentText?: string): boolean {
  const isRunning = Boolean(
    state.activeSession?.isGenerating ||
    state.isSending ||
    state.isAwaitingResponse
  );
  const text = currentText !== undefined ? currentText : state.composerDraft || '';
  const hasContent = Boolean(text.trim().length > 0 || (state.attachments && state.attachments.length > 0));
  return isRunning && !hasContent;
}

export function updateComposerButton(
  state: AppState,
  root?: { querySelector: (sel: string) => any; getElementById?: (id: string) => any }
): void {
  const doc = root || (typeof document !== 'undefined' ? document : undefined);
  if (!doc) return;

  const btn = doc.querySelector('.composer-actions .send-btn, #btn-send, #btn-stop');
  if (!btn) return;

  const composer = (typeof doc.getElementById === 'function'
    ? doc.getElementById('composer-input')
    : doc.querySelector('#composer-input')) as HTMLTextAreaElement | null;
  const currentText = composer ? composer.value : state.composerDraft;
  const stopMode = isComposerStopMode(state, currentText);

  btn.id = stopMode ? 'btn-stop' : 'btn-send';
  btn.className = stopMode ? 'send-btn btn-stop stop-mode' : 'send-btn btn-send';
  btn.title = stopMode ? 'Stop (Immediate stop)' : 'Send (Enter)';
  btn.setAttribute('aria-label', stopMode ? 'Stop agent' : 'Send message');

  const sendIcon = btn.querySelector('.send-icon');
  const stopIcon = btn.querySelector('.stop-icon');
  if (sendIcon?.classList) sendIcon.classList.toggle('hidden', stopMode);
  if (stopIcon?.classList) stopIcon.classList.toggle('hidden', !stopMode);
}
