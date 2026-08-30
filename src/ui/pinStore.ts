const PIN_STORAGE_KEY = 'agent_monitor_pinned_sessions';
let memoryPinnedIds: string[] = [];

export function getPinnedSessionIds(): string[] {
  if (typeof localStorage === 'undefined') return [...memoryPinnedIds];
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return [...memoryPinnedIds];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [...memoryPinnedIds];
  } catch {
    return [...memoryPinnedIds];
  }
}

export function setPinnedSessionIds(ids: string[]): void {
  memoryPinnedIds = [...ids];
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

export function isSessionPinned(sessionId: string): boolean {
  return getPinnedSessionIds().includes(sessionId);
}

export function togglePinnedSession(sessionId: string): boolean {
  const current = getPinnedSessionIds();
  const index = current.indexOf(sessionId);
  let next: string[];
  let isPinnedNow: boolean;
  if (index >= 0) {
    next = current.filter((id) => id !== sessionId);
    isPinnedNow = false;
  } else {
    next = [...current, sessionId];
    isPinnedNow = true;
  }
  setPinnedSessionIds(next);
  return isPinnedNow;
}
