import type { AppState } from './types';
import { renderSettingsQrSection } from './components/settingsModal/settingsQrSection';
import { renderSettingsNetworkSection } from './components/settingsModal/settingsNetworkSection';
import { renderSettingsSyncSection } from './components/settingsModal/settingsSyncSection';
import { renderSettingsAppSection } from './components/settingsModal/settingsAppSection';

export function initModalSectionsCache(container: HTMLElement, state: AppState): void {
  const qrEl = container.querySelector<HTMLElement>('#settings-section-qr');
  if (qrEl) qrEl.dataset.renderedHtml = renderSettingsQrSection(state);

  const netEl = container.querySelector<HTMLElement>('#settings-section-network');
  if (netEl) netEl.dataset.renderedHtml = renderSettingsNetworkSection(state);

  const syncEl = container.querySelector<HTMLElement>('#settings-section-sync');
  if (syncEl) syncEl.dataset.renderedHtml = renderSettingsSyncSection(state);

  const appEl = container.querySelector<HTMLElement>('#settings-section-app');
  if (appEl) appEl.dataset.renderedHtml = renderSettingsAppSection(state);
}

function updateSection(
  modalEl: HTMLElement,
  selector: string,
  renderFn: (state: AppState) => string,
  state: AppState
): void {
  const el = modalEl.querySelector<HTMLElement>(selector);
  if (!el) return;

  const nextHtml = renderFn(state);
  if (el.dataset.renderedHtml !== nextHtml) {
    el.outerHTML = nextHtml;
    const newEl = modalEl.querySelector<HTMLElement>(selector);
    if (newEl) {
      newEl.dataset.renderedHtml = nextHtml;
    }
  }
}

export function updateSettingsModalDOM(state: AppState, modalEl: HTMLElement): void {
  updateSection(modalEl, '#settings-section-qr', renderSettingsQrSection, state);
  updateSection(modalEl, '#settings-section-network', renderSettingsNetworkSection, state);
  updateSection(modalEl, '#settings-section-sync', renderSettingsSyncSection, state);
  updateSection(modalEl, '#settings-section-app', renderSettingsAppSection, state);
}
