import type { AppState } from './types';

export function isAgentRunning(state: AppState): boolean {
  if (state.isSending || state.isAwaitingResponse) return true;
  if (state.activeSession?.isGenerating) return true;
  if (state.activeSession?.subagents?.some((s) => s.status === 'running')) return true;
  if (state.activeSession?.backgroundTasks?.some((t) => t.status === 'running')) return true;
  const currentSession = state.sessions.find(
    (s) => s.id === (state.activeSessionId || state.activeSession?.id)
  );
  if (currentSession?.isGenerating) return true;
  const lastMsg = state.activeSession?.messages?.slice(-1)[0];
  if (lastMsg && lastMsg.role === 'assistant' && (lastMsg as any).isLive) return true;
  return false;
}

export function isComposerStopMode(state: AppState, _currentText?: string): boolean {
  return isAgentRunning(state);
}

export function renderStopButtonHtml(): string {
  return `
    <button
      type="button"
      class="send-btn btn-stop stop-mode"
      id="btn-stop"
      title="Stop (Immediate stop)"
      aria-label="Stop agent"
    >
      <svg class="submit-icon stop-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <rect x="4.5" y="4.5" width="7" height="7" rx="1.5"/>
      </svg>
    </button>
  `.trim();
}

export function renderSendButtonHtml(stopModeActive = false): string {
  return `
    <button
      type="button"
      class="send-btn btn-send"
      id="btn-send"
      title="${stopModeActive ? 'Send / Queue instruction (Enter)' : 'Send (Enter)'}"
      aria-label="Send message"
    >
      <svg class="submit-icon send-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 12V4M8 4L5 7M8 4l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `.trim();
}

export function renderComposerActionsHtml(state: AppState, currentText?: string): string {
  const isRunning = isAgentRunning(state);
  const text = currentText !== undefined ? currentText : state.composerDraft || '';
  const hasContent = Boolean(text.trim().length > 0 || (state.attachments && state.attachments.length > 0));

  if (isRunning) {
    if (hasContent) {
      return `${renderStopButtonHtml()}${renderSendButtonHtml(true)}`;
    }
    return renderStopButtonHtml();
  }
  return renderSendButtonHtml(false);
}

export function updateComposerButton(
  state: AppState,
  root?: { querySelector: (sel: string) => any; getElementById?: (id: string) => any }
): void {
  const doc = root || (typeof document !== 'undefined' ? document : undefined);
  if (!doc) return;

  const composer = (typeof doc.getElementById === 'function'
    ? doc.getElementById('composer-input')
    : doc.querySelector?.('#composer-input')) as HTMLTextAreaElement | null;
  const currentText = composer ? composer.value : state.composerDraft;
  const isRunning = isAgentRunning(state);

  const actionsContainer = doc.querySelector?.('.composer-actions');
  if (actionsContainer && typeof actionsContainer.innerHTML === 'string') {
    actionsContainer.innerHTML = renderComposerActionsHtml(state, currentText);
    return;
  }

  const btn = doc.querySelector?.('.composer-actions .send-btn, #btn-send, #btn-stop');
  if (!btn) return;

  const stopMode = isRunning;
  btn.id = stopMode ? 'btn-stop' : 'btn-send';
  btn.className = stopMode ? 'send-btn btn-stop stop-mode' : 'send-btn btn-send';
  btn.title = stopMode ? 'Stop (Immediate stop)' : 'Send (Enter)';
  if (typeof btn.setAttribute === 'function') {
    btn.setAttribute('aria-label', stopMode ? 'Stop agent' : 'Send message');
  }

  const sendIcon = btn.querySelector?.('.send-icon');
  const stopIcon = btn.querySelector?.('.stop-icon');
  if (sendIcon?.classList?.toggle) sendIcon.classList.toggle('hidden', stopMode);
  if (stopIcon?.classList?.toggle) stopIcon.classList.toggle('hidden', !stopMode);
}
