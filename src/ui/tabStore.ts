import type { ActiveTab } from './types';

const TAB_STORAGE_KEY = 'agent_active_tab';
const SESSION_STORAGE_KEY = 'agent_active_session_id';
const SESSION_CACHE_PREFIX = 'agent_cached_session_';

const memoryStorage: Record<string, string> = {};

function getStorage(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } {
  if (typeof localStorage !== 'undefined') return localStorage;
  return {
    getItem: (k: string) => (k in memoryStorage ? memoryStorage[k]! : null),
    setItem: (k: string, v: string) => { memoryStorage[k] = v; },
    removeItem: (k: string) => { delete memoryStorage[k]; },
  };
}

export function getSavedTab(): ActiveTab | null {
  try {
    const val = getStorage().getItem(TAB_STORAGE_KEY);
    if (val === 'sidebar' || val === 'chat' || val === 'plans') return val as ActiveTab;
  } catch {}
  return null;
}

export function saveActiveTab(tab: ActiveTab): void {
  try { getStorage().setItem(TAB_STORAGE_KEY, tab); } catch {}
}

export function getSavedSessionId(): string | null {
  try { return getStorage().getItem(SESSION_STORAGE_KEY); } catch { return null; }
}

export function saveActiveSessionId(sessionId?: string): void {
  try {
    const s = getStorage();
    if (sessionId) s.setItem(SESSION_STORAGE_KEY, sessionId);
    else s.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

export function getCachedSessionDetail(sessionId: string): any | null {
  if (!sessionId) return null;
  try {
    const raw = getStorage().getItem(`${SESSION_CACHE_PREFIX}${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedSessionDetail(detail: any): void {
  if (!detail?.id) return;
  try {
    getStorage().setItem(`${SESSION_CACHE_PREFIX}${detail.id}`, JSON.stringify(detail));
  } catch {}
}
