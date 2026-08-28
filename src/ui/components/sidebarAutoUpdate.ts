import type { AppState } from '../types';
import { isAutoUpdateEnabled } from '../updateManager';
import { CLIENT_VERSION } from '../version';

export function renderSidebarAutoUpdate(state: AppState): string {
  const autoUpdate = state.autoUpdateEnabled ?? isAutoUpdateEnabled();

  return `
    <div class="sidebar-auto-update" role="region" aria-label="Auto Update Settings">
      <div class="sidebar-auto-update-label">
        <span class="sidebar-auto-update-title">Auto-update <span class="sidebar-version-tag">v${CLIENT_VERSION}</span></span>
        <span class="sidebar-auto-update-desc">Automatically download new releases</span>
      </div>
      <label class="switch" for="toggle-auto-update" aria-label="Toggle Auto-update">
        <input
          type="checkbox"
          id="toggle-auto-update"
          class="btn-toggle-auto-update"
          ${autoUpdate ? 'checked' : ''}
        />
        <span class="slider round"></span>
      </label>
    </div>
  `;
}
