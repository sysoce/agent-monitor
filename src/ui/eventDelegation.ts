import type { AppState, ActiveTab } from './types';
import type { EventHandlerCallbacks } from './eventHandlers';
import { saveActiveTab } from './tabStore';
import { handleModelPickerClick } from './modelPickerEvents';
import { handleSettingsModalClick } from './settingsModalEvents';
import {
  handleCopyAction,
  handlePlanClick,
  handleControlClick,
  copyToClipboard,
} from './controlHandlers';

export { handleCopyAction, handlePlanClick, handleControlClick, copyToClipboard };

export function handleDelegatedClick(target: HTMLElement | null, state: AppState, callbacks: EventHandlerCallbacks): boolean {
  if (!target) return false;
  if (handleCopyAction(target)) return true;

  const tabBtn = target.closest<HTMLElement>('.tab-btn');
  if (tabBtn) {
    const tab = (tabBtn.getAttribute('data-tab') as ActiveTab) || 'chat';
    state.activeTab = tab;
    saveActiveTab(tab);
    callbacks.onRender();
    return true;
  }
  const sessionCard = target.closest<HTMLElement>('.session-card');
  if (sessionCard) {
    const id = sessionCard.getAttribute('data-session-id');
    if (id) {
      state.activePlan = undefined;
      state.activePlanName = undefined;
      void callbacks.onSelectSession(id);
      return true;
    }
  }

  const sectionHeader = target.closest<HTMLElement>('.section-header');
  if (sectionHeader) {
    const sectionKey = sectionHeader.getAttribute('data-section');
    if (sectionKey) {
      state.expandedSections = {
        subagents: true,
        filesChanged: true,
        artifacts: true,
        uploads: true,
        tasks: true,
        ...(state.expandedSections || {}),
      };
      state.expandedSections[sectionKey] = !state.expandedSections[sectionKey];
      callbacks.onRender();
      return true;
    }
  }

  const seeAll = target.closest<HTMLElement>('.see-all-link');
  if (seeAll) {
    const toggleKey = seeAll.getAttribute('data-toggle-see-all');
    if (toggleKey) {
      state.showAllItems = state.showAllItems || {};
      state.showAllItems[toggleKey] = !state.showAllItems[toggleKey];
      callbacks.onRender();
      return true;
    }
  }

  const toggleHeader = target.closest<HTMLElement>('.activity-toggle-header');
  if (toggleHeader) {
    toggleHeader.closest('.activity-toggle')?.classList.toggle('expanded');
    return true;
  }
  const shellBtn = target.closest<HTMLElement>('.shell-btn');
  if (shellBtn) {
    const cmdId = shellBtn.getAttribute('data-command-id') || '';
    const decision = shellBtn.getAttribute('data-decision');
    if (cmdId && callbacks.onResolveApproval) {
      void callbacks.onResolveApproval(cmdId, decision === 'allow');
      return true;
    }
  }
  const tasksToggle = target.closest<HTMLElement>('#btn-toggle-background-tasks, .tasks-toggle-btn');
  if (tasksToggle) {
    const card = tasksToggle.closest('.background-tasks-card');
    const list = card?.querySelector('.background-tasks-list');
    if (card && list) {
      card.classList.toggle('tasks-card--collapsed');
      list.classList.toggle('hidden');
      tasksToggle.setAttribute('aria-expanded', String(!card.classList.contains('tasks-card--collapsed')));
    }
    return true;
  }
  const queuedAction = target.closest<HTMLElement>('[data-action^="queued-"]');
  if (queuedAction) {
    const action = queuedAction.getAttribute('data-action');
    const id = queuedAction.getAttribute('data-id') || queuedAction.closest('.queued-message-item')?.getAttribute('data-id') || '';
    if (id) {
      if (action === 'queued-send-now') {
        void callbacks.onSendNowQueued?.(id);
        return true;
      }
      if (action === 'queued-edit') {
        callbacks.onEditQueued?.(id);
        return true;
      }
      if (action === 'queued-delete') {
        callbacks.onDeleteQueued?.(id);
        return true;
      }
    }
  }

  const queuedToggle = target.closest<HTMLElement>('#btn-queued-toggle, #queued-messages-header');
  if (queuedToggle) {
    callbacks.onToggleQueuedCollapse?.();
    return true;
  }

  if (handleSettingsModalClick(state, target, callbacks)) return true;
  if (handleModelPickerClick(target, state, callbacks)) return true;
  if (handlePlanClick(target, state, callbacks)) return true;
  if (handleControlClick(target, state, callbacks)) return true;
  return false;
}
