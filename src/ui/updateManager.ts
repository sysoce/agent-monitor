import type { AppState } from './types';
import { CLIENT_VERSION, isNewerVersion } from './version';

const AUTO_UPDATE_KEY = 'agent_auto_update';

export function isAutoUpdateEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(AUTO_UPDATE_KEY) !== 'false';
}

export function setAutoUpdateEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(AUTO_UPDATE_KEY, String(enabled));
}

export function triggerBundleDownload(url = '/download'): void {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agent-monitor.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export interface VersionCheckResult {
  hasUpdate: boolean;
  autoDownloaded: boolean;
}

export function processVersionCheck(
  state: AppState,
  remoteVersion: string,
  currentVersion: string = CLIENT_VERSION,
  downloader: (url: string) => void = triggerBundleDownload
): VersionCheckResult {
  const hasUpdate = isNewerVersion(remoteVersion, currentVersion);
  if (!hasUpdate) {
    return { hasUpdate: false, autoDownloaded: false };
  }

  state.availableUpdateVersion = remoteVersion;
  const autoUpdate = isAutoUpdateEnabled();
  state.autoUpdateEnabled = autoUpdate;

  if (autoUpdate) {
    downloader('/download');
    state.updateDownloaded = true;
    state.isUpdateModalOpen = true;
    return { hasUpdate: true, autoDownloaded: true };
  }

  state.updateDownloaded = false;
  return { hasUpdate: true, autoDownloaded: false };
}

export async function checkForUpdates(
  state: AppState,
  onRender: () => void
): Promise<boolean> {
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json() as { version?: string };
    if (!data?.version) return false;

    const result = processVersionCheck(state, data.version);
    if (result.hasUpdate) {
      onRender();
      return true;
    }
  } catch {
    // Local server offline or in standalone mode
  }
  return false;
}
