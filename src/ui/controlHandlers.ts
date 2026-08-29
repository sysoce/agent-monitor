import type { AppState } from './types';
import type { EventHandlerCallbacks } from './eventHandlers';
import { saveActiveTab } from './tabStore';
import { filterSessionCardsInPlace } from './sessionFilter';
import { isComposerStopMode } from './composerButton';
import { flashCopyButton, copyTextToClipboard } from './copyActions';
import { setAutoUpdateEnabled, triggerBundleDownload } from './updateManager';

export const copyToClipboard = copyTextToClipboard;

export function handleCopyAction(target: HTMLElement): boolean {
  const copyBtn = target.closest<HTMLElement>('.copy-btn, .code-copy-btn');
  if (!copyBtn) return false;
  let text = copyBtn.getAttribute('data-copy-text');
  if (!text) {
    const block = copyBtn.closest('.code-block, .diff-card, .activity-toggle');
    if (block) {
      text = block.querySelector('code, .activity-toggle-output')?.textContent || '';
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

export function handlePlanClick(target: HTMLElement, state: AppState, callbacks: EventHandlerCallbacks): boolean {
  const buildBtn = target.closest<HTMLElement>('.plan-build-btn');
  if (buildBtn) {
    const planPath = buildBtn.getAttribute('data-plan-path') || '';
    const planTitle = buildBtn.getAttribute('data-plan-title') || buildBtn.closest('.plan-card')?.querySelector('.plan-card-title')?.textContent?.trim() || '';
    if (callbacks.onBuildPlan) void callbacks.onBuildPlan(planPath, planTitle);
    else {
      state.composerMode = 'agent';
      state.activePlan = undefined;
      state.activePlanName = undefined;
      state.activeTab = 'chat';
      callbacks.onRender();
    }
    return true;
  }

  const planLink = target.closest<HTMLElement>('.plan-view-btn, .plan-link-item, .md-plan-link, .session-plan-chip, [data-plan-path], [data-open-artifact]');
  if (planLink) {
    const planPath = planLink.getAttribute('data-plan-path') || planLink.getAttribute('data-open-artifact') || '';
    if (!planPath) return false;
    const cleanPath = planPath.replace(/^📋\s*/, '').replace(/^file:\/\//, '').trim();
    const name = cleanPath.split('/').pop() || cleanPath;
    state.activePlanName = name;
    state.activeTab = 'chat';
    void callbacks.onSelectPlan(name);
    return true;
  }
  return false;
}

export function handleControlClick(target: HTMLElement, state: AppState, callbacks: EventHandlerCallbacks): boolean {
  const autoUpdateChk = target.closest<HTMLInputElement>('#toggle-auto-update, .btn-toggle-auto-update');
  if (autoUpdateChk) {
    setAutoUpdateEnabled(autoUpdateChk.checked);
    state.autoUpdateEnabled = autoUpdateChk.checked;
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
  const attRemove = target.closest<HTMLElement>('.attachment-pill-remove');
  if (attRemove) {
    const id = attRemove.getAttribute('data-att-id');
    state.attachments = (state.attachments || []).filter((a) => a.id !== id);
    callbacks.onRender();
    return true;
  }
  return false;
}
