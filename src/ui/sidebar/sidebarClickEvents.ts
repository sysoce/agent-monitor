import type { AppState } from '../types';
import type { EventHandlerCallbacks } from '../eventHandlers';
import { togglePinnedSession, getPinnedSessionIds } from '../pinStore';

export function handleSidebarDelegatedClick(
  target: HTMLElement,
  state: AppState,
  callbacks: EventHandlerCallbacks
): boolean {
  const filterTabBtn = target.closest<HTMLElement>('[data-filter-tab]');
  if (filterTabBtn) {
    const filter = filterTabBtn.getAttribute('data-filter-tab') as any;
    if (filter) {
      state.activeFilterTab = filter;
      callbacks.onRender();
      return true;
    }
  }

  const pinBtn = target.closest<HTMLElement>('[data-pin-id]');
  if (pinBtn) {
    const pinId = pinBtn.getAttribute('data-pin-id');
    if (pinId) {
      togglePinnedSession(pinId);
      state.pinnedSessionIds = getPinnedSessionIds();
      callbacks.onRender();
      return true;
    }
  }

  const stopBtn = target.closest<HTMLElement>('[data-stop-id]');
  if (stopBtn) {
    void callbacks.onStopSession?.();
    return true;
  }

  const sessionItem = target.closest<HTMLElement>('.session-item, .session-card');
  if (sessionItem && !target.closest('.session-row-action, .session-plan-chip')) {
    const id = sessionItem.getAttribute('data-session-id');
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

  return false;
}
