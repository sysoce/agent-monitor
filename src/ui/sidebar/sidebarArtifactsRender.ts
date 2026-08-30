import { escapeHtml, getFileBadgeInfo, ICONS } from './sidebarDom';
import type { SidebarArtifact } from './types';

export function renderArtifactRow(artifact: SidebarArtifact): string {
  const parts = artifact.path.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1] : 'md';
  const badge = getFileBadgeInfo(ext);

  return `
    <div class="sidebar-artifact-row" data-open-artifact="${escapeHtml(artifact.path)}" title="Open ${escapeHtml(artifact.path)}">
      <span class="file-badge" style="background:${badge.bg};color:${badge.fg}">${badge.label}</span>
      <div class="artifact-info">
        <div class="artifact-name">${escapeHtml(artifact.name)}</div>
        <div class="artifact-path">${escapeHtml(artifact.path)}</div>
      </div>
      <span class="artifact-open-icon">${ICONS.document}</span>
    </div>
  `;
}

export function renderDashboardArtifactsSection(artifacts: SidebarArtifact[], searchQuery = ''): string {
  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? artifacts.filter((a) => a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q))
    : artifacts;

  if (filtered.length === 0) {
    return `<div class="empty-hint">${q ? 'No matching deliverables or artifacts' : 'No deliverables generated yet'}</div>`;
  }

  return `
    <div class="dashboard-artifacts-section">
      <div class="artifacts-list">
        ${filtered.map(renderArtifactRow).join('')}
      </div>
    </div>
  `;
}
