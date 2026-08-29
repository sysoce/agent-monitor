import type { AppState } from '../../types';
import { renderSettingsQrSection } from './settingsQrSection';
import { renderSettingsNetworkSection } from './settingsNetworkSection';
import { renderSettingsSyncSection } from './settingsSyncSection';
import { renderSettingsAppSection } from './settingsAppSection';

export function renderSettingsModal(state: AppState): string {
  if (!state.isSettingsModalOpen && !state.isQrModalOpen) return '';

  return `
    <div class="update-modal-backdrop settings-modal-backdrop" id="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-heading">
      <div class="update-modal settings-modal-card">
        <div class="update-modal-header settings-modal-header">
          <div class="update-modal-badge update-modal-badge--info">
            <span>⚙️</span>
            <span id="settings-modal-heading">Settings & Connect</span>
          </div>
          <button type="button" class="btn-close-modal" id="btn-close-settings" title="Close Settings">✕</button>
        </div>
        <div class="update-modal-body settings-modal-body">
          ${renderSettingsQrSection(state)}
          ${renderSettingsNetworkSection(state)}
          ${renderSettingsSyncSection(state)}
          ${renderSettingsAppSection(state)}
        </div>
      </div>
    </div>
  `;
}
