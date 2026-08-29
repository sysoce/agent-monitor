export const STORAGE_KEY_AUTO_FALLBACK = 'agent_auto_fallback';

export function isAutoFallbackEnabled(
  storage: Storage = typeof localStorage !== 'undefined' ? localStorage : ({} as Storage)
): boolean {
  try {
    const val = storage.getItem?.(STORAGE_KEY_AUTO_FALLBACK);
    if (val === 'false' || val === '0') return false;
    return true;
  } catch {
    return true;
  }
}

export function setAutoFallbackEnabled(
  enabled: boolean,
  storage: Storage = typeof localStorage !== 'undefined' ? localStorage : ({} as Storage)
): void {
  try {
    storage.setItem?.(STORAGE_KEY_AUTO_FALLBACK, String(enabled));
  } catch {}
}
