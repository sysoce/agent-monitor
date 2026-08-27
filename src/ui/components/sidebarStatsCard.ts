import type { AppState } from '../types';

export function renderMonitorSidebarStats(state: AppState): string {
  let running = 0;
  let totalMessages = 0;
  let totalArtifacts = 0;

  for (const s of state.sessions) {
    if (s.isGenerating) running++;
    totalMessages += s.messageCount || 0;
    if (s.artifacts) totalArtifacts += s.artifacts.length;
  }

  return `
    <div class="monitor-stats-widget" role="region" aria-label="Dashboard Metrics">
      <div class="monitor-stats-grid">
        <div class="monitor-stat-item">
          <div class="monitor-stat-label">
            <span class="pulse-indicator ${running > 0 ? 'live' : ''}"></span>
            Running
          </div>
          <div class="monitor-stat-val running-num">${running}</div>
        </div>
        <div class="monitor-stat-item">
          <div class="monitor-stat-label">Sessions</div>
          <div class="monitor-stat-val">${state.sessions.length}</div>
        </div>
        <div class="monitor-stat-item">
          <div class="monitor-stat-label">Messages</div>
          <div class="monitor-stat-val">${totalMessages}</div>
        </div>
        <div class="monitor-stat-item">
          <div class="monitor-stat-label">Artifacts</div>
          <div class="monitor-stat-val">${totalArtifacts}</div>
        </div>
      </div>
    </div>
  `;
}
