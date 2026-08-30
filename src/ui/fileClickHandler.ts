import type { AppState } from './types';
import type { EventHandlerCallbacks } from './eventHandlers';
import { isPlanFilePath } from '../utils/planExtractor';
import { copyTextToClipboard, flashCopyButton } from './copyActions';

export function extractCleanFilePath(rawPath: string): string {
  if (!rawPath) return '';
  return rawPath
    .trim()
    .replace(/^file:\/\//i, '')
    .replace(/#L\d+(?:-L?\d+)?$/i, '')
    .replace(/:\d+(?::\d+)?$/, '')
    .trim();
}

export function handleFileClick(
  target: HTMLElement,
  state: AppState,
  callbacks: EventHandlerCallbacks,
  copyFn: (text: string) => Promise<boolean> = copyTextToClipboard
): boolean {
  const fileEl = target.closest<HTMLElement>(
    'a.md-link[href^="file://"], a.md-link[href^="file:/"], [data-file-path], .inline-code--link'
  );
  if (!fileEl) return false;

  const raw =
    fileEl.getAttribute('data-file-path') ||
    fileEl.getAttribute('href') ||
    fileEl.textContent ||
    '';

  const cleanPath = extractCleanFilePath(raw);
  if (!cleanPath) return false;

  if (isPlanFilePath(cleanPath)) {
    const name = cleanPath.split('/').pop() || cleanPath;
    state.activePlanName = name;
    state.activeTab = 'chat';
    void callbacks.onSelectPlan(name);
    return true;
  }

  void (async () => {
    const copied = await copyFn(cleanPath);
    if (copied) {
      flashCopyButton(fileEl);
    }
  })();
  return true;
}
