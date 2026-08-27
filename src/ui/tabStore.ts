import type { ActiveTab } from './types';

const TAB_STORAGE_KEY = 'agent_active_tab';
const SESSION_STORAGE_KEY = 'agent_active_session_id';

export function getSavedTab(): ActiveTab | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const val = localStorage.getItem(TAB_STORAGE_KEY);
    if (val === 'sidebar' || val === 'chat' || val === 'plans') {
      return val as ActiveTab;
    }
  } catch {}
  return null;
}

export function saveActiveTab(tab: ActiveTab): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {}
}

export function getSavedSessionId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {}
  return null;
}

export function saveActiveSessionId(sessionId?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (sessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {}
}
