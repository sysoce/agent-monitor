import type { AppState } from './types';
import type { EventHandlerCallbacks } from './eventHandlers';
import { saveActiveTab } from './tabStore';
import { filterSessionCardsInPlace } from './sessionFilter';
import { flashCopyButton, copyTextToClipboard } from './copyActions';
import { setAutoUpdateEnabled, triggerBundleDownload } from './updateManager';
import { setAutoFallbackEnabled } from './fallbackSettings';
import { handlePlanClick } from './planClickHandler';

export const copyToClipboard = copyTextToClipboard;
export { handlePlanClick };

export function handleCopyAction(target: HTMLElement): boolean {
  const copyBtn = target.closest<HTMLElement>('.copy-btn, .code-copy-btn, .msg-error-btn--copy');
  if (!copyBtn) return false;
  let text = copyBtn.getAttribute('data-copy-text');
  if (!text) {
    const block = copyBtn.closest('.code-block, .diff-card, .activity-toggle, .msg-error-card');
    if (block) {
      text = block.querySelector('code, .activity-toggle-output, .msg-error-body')?.textContent || '';
    } else {
      const turn = copyBtn.closest('.turn');
      text = turn?.querySelector('.msg-user-text, .msg.assistant .msg-text')?.textContent || '';
    }
  }
  if (text) {
    void copyToClipboard(text);
    flashCopyButton(copyBtn);
  }
  return true;
}

export function handleControlClick(target: HTMLElement, state: AppState, callbacks: EventHandlerCallbacks): boolean {
  if (target.closest('#btn-error-settings, .btn-error-settings')) {
    state.isSettingsModalOpen = true;
    callbacks.onRender();
    return true;
  }
  if (target.closest('#btn-error-retry, .btn-error-retry')) {
    const input = typeof document !== 'undefined' ? (document.getElementById('composer-input') as HTMLTextAreaElement | null) : null;
    if (!input?.value?.trim() && !state.composerDraft?.trim()) {
      const msgs = state.activeSession?.messages || [];
      const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
      if (lastUser && typeof lastUser.content === 'string' && lastUser.content.trim()) {
        if (input) input.value = lastUser.content.trim();
        state.composerDraft = lastUser.content.trim();
      }
    }
    void callbacks.onSendMessage();
    return true;
  }

  const fallbackRow = target.closest<HTMLElement>('.settings-fallback-row');
  const autoFallbackChk = target.closest<HTMLInputElement>('#toggle-auto-fallback, .btn-toggle-auto-fallback') ||
    (fallbackRow ? fallbackRow.querySelector<HTMLInputElement>('#toggle-auto-fallback') : null);
  if (autoFallbackChk) {
    const isDirectChk = Boolean(target.closest('#toggle-auto-fallback, .btn-toggle-auto-fallback'));
    const nextVal = isDirectChk ? autoFallbackChk.checked : !autoFallbackChk.checked;
    autoFallbackChk.checked = nextVal;
    setAutoFallbackEnabled(nextVal);
    state.autoFallbackEnabled = nextVal;
    callbacks.onToggleAutoFallback?.(nextVal);
    callbacks.onRender();
    return true;
  }
  const updateRow = target.closest<HTMLElement>('.settings-update-row');
  const autoUpdateChk = target.closest<HTMLInputElement>('#toggle-auto-update, .btn-toggle-auto-update') ||
    (updateRow ? updateRow.querySelector<HTMLInputElement>('#toggle-auto-update') : null);
  if (autoUpdateChk) {
    const isDirectChk = Boolean(target.closest('#toggle-auto-update, .btn-toggle-auto-update'));
    const nextVal = isDirectChk ? autoUpdateChk.checked : !autoUpdateChk.checked;
    autoUpdateChk.checked = nextVal;
    setAutoUpdateEnabled(nextVal);
    state.autoUpdateEnabled = nextVal;
    callbacks.onRender();
    return true;
  }
  if (target.closest('#btn-reload-page, .btn-reload-update')) {
    if (typeof window !== 'undefined') window.location.reload();
    return true;
  }
  if (target.closest('#btn-download-bundle, .btn-download-update')) {
    triggerBundleDownload();
    return true;
  }
  if (target.closest('#btn-mode-toggle')) {
    const composer = typeof document !== 'undefined' ? (document.getElementById('composer-input') as HTMLTextAreaElement | null) : null;
    if (composer) state.composerDraft = composer.value;
    const modes: Array<'agent' | 'plan' | 'ask'> = ['agent', 'plan', 'ask'];
    state.composerMode = modes[(modes.indexOf(state.composerMode) + 1) % modes.length]!;
    callbacks.onRender();
    return true;
  }
  if (target.closest('#btn-toggle-sync')) { callbacks.onToggleSyncMode?.(); return true; }
  if (target.closest('#btn-logout')) { callbacks.onLogout?.(); return true; }
  if (target.closest('#btn-new-session')) { void callbacks.onNewSession(); return true; }

  const bgTasksStopBtn = target.closest('#btn-stop-background-tasks, .tasks-stop-btn');
  if (bgTasksStopBtn) {
    void callbacks.onStopSession?.();
    return true;
  }

  const stopBtn = target.closest('#btn-stop, .btn-stop, .stop-mode');
  if (stopBtn) {
    void callbacks.onStopSession?.();
    return true;
  }

  const sendBtn = target.closest('#btn-send, .btn-send, .send-btn');
  if (sendBtn) {
    void callbacks.onSendMessage();
    return true;
  }
  if (target.closest('#btn-back-to-chat')) {
    state.activePlan = undefined; state.activePlanName = undefined; state.activeTab = 'chat';
    saveActiveTab('chat'); callbacks.onRender(); return true;
  }
  if (target.closest('#btn-clear-search')) {
    state.searchQuery = '';
    const search = typeof document !== 'undefined' ? (document.getElementById('session-search') as HTMLInputElement | null) : null;
    if (search) search.value = '';
    filterSessionCardsInPlace('');
    return true;
  }
  const attRemove = target.closest<HTMLElement>('.attachment-pill-remove, .attachment-image-remove');
  if (attRemove) {
    const id = attRemove.getAttribute('data-att-id');
    state.attachments = (state.attachments || []).filter((a) => a.id !== id);
    callbacks.onRender();
    return true;
  }
  return false;
}
