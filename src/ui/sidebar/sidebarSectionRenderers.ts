import { escapeHtml, ICONS } from './sidebarDom';
import type { SidebarArtifact, SidebarBackgroundTask, SidebarChangedFile, SidebarSkill, SidebarSubagent, SidebarUpload } from './types';

const INITIAL_LIMIT = 5;

function renderFileRow(f: SidebarChangedFile): string {
  const deleted = f.status === 'deleted';
  const adds = (f.additions ?? 0) > 0 ? `<span class="diff-stat--add">+${f.additions}</span>` : '';
  const dels = (f.deletions ?? 0) > 0 ? `<span class="diff-stat--del">-${f.deletions}</span>` : '';
  const stats = adds || dels ? `<span class="file-stats">${adds}${dels}</span>` : '';
  const openAttr = deleted ? '' : ` data-open-file="${escapeHtml(f.fullPath)}"`;
  const cls = deleted ? 'file-row file-row--deleted' : 'file-row';
  return `
    <div class="${cls}"${openAttr} title="${escapeHtml(f.fullPath)}">
      <span class="row-icon">${ICONS.document}</span>
      <span class="file-name">${escapeHtml(f.file)}</span>
      <span class="file-dir">${escapeHtml(f.fullPath || f.dir)}</span>
      ${stats}
    </div>
  `;
}

export function renderFilesChanged(files: SidebarChangedFile[], isExpanded: boolean, showAll: boolean): string {
  if (!isExpanded) return '';
  if (files.length === 0) return '<div class="empty-item">No files changed in this session</div>';
  const displayed = showAll ? files : files.slice(0, INITIAL_LIMIT);
  const rows = displayed.map(renderFileRow).join('');
  const seeAllBtn = files.length > INITIAL_LIMIT
    ? `<div class="see-all-link" data-toggle-see-all="filesChanged">${showAll ? 'Show less' : `See all (${files.length})`}</div>`
    : '';
  return `<div class="section-content">${rows}${seeAllBtn}</div>`;
}

export function renderArtifacts(artifacts: SidebarArtifact[], isExpanded: boolean, showAll: boolean): string {
  if (!isExpanded) return '';
  if (artifacts.length === 0) return '<div class="empty-item">No artifacts created yet</div>';
  const displayed = showAll ? artifacts : artifacts.slice(0, INITIAL_LIMIT);
  const rows = displayed.map((a) => `
    <div class="artifact-row" data-open-artifact="${escapeHtml(a.path)}" title="${escapeHtml(a.path)}">
      <span class="row-icon">${ICONS.code}</span>
      <span class="row-text artifact-name">${escapeHtml(a.name)}</span>
    </div>
  `).join('');
  const seeAllBtn = artifacts.length > INITIAL_LIMIT
    ? `<div class="see-all-link" data-toggle-see-all="artifacts">${showAll ? 'Show less' : `See all (${artifacts.length})`}</div>`
    : '';
  return `<div class="section-content">${rows}${seeAllBtn}</div>`;
}

export function renderUploads(uploads: SidebarUpload[], isExpanded: boolean): string {
  if (!isExpanded) return '';
  if (uploads.length === 0) return '<div class="empty-item">No uploads or attachments</div>';
  const rows = uploads.map((u) => {
    const timeStr = u.timestamp ? new Date(u.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return `
      <div class="upload-row" ${u.path ? `data-open-file="${escapeHtml(u.path)}"` : ''} title="${escapeHtml(u.label)}">
        <span class="row-icon">${ICONS.image}</span>
        <span class="row-text">${escapeHtml(u.label)}${timeStr ? ` (${timeStr})` : ''}</span>
      </div>
    `;
  }).join('');
  return `<div class="section-content">${rows}</div>`;
}

export function renderSubagents(subagents: SidebarSubagent[], isExpanded: boolean): string {
  if (!isExpanded) return '';
  if (subagents.length === 0) return '<div class="empty-item">No active subagents</div>';
  const rows = subagents.map((s) => `
    <div class="subagent-row" title="${escapeHtml(s.summary || s.role)}">
      <span class="row-icon">${ICONS.chat}</span>
      <span class="row-text subagent-name">${escapeHtml(s.role)}</span>
      ${s.summary ? `<span class="subagent-summary">${escapeHtml(s.summary)}</span>` : ''}
    </div>
  `).join('');
  return `<div class="section-content">${rows}</div>`;
}

export function renderTasks(tasks: SidebarBackgroundTask[], isExpanded: boolean): string {
  if (!isExpanded) return '';
  if (tasks.length === 0) return '<div class="empty-item">No background tasks</div>';
  const rows = tasks.map((t) => {
    const isDone = t.status === 'completed' || t.status === 'done';
    const isRunning = t.status === 'running' || !t.status;
    const icon = isRunning ? ICONS.taskSpinner : isDone ? ICONS.checkCircle : ICONS.errorCircle;
    const iconClass = isRunning ? 'task-spinner-icon' : isDone ? 'task-check-icon' : 'task-failed-icon';
    return `
    <div class="task-row task-row--${t.status || 'running'}" title="${escapeHtml(t.command || t.name)}">
      <span class="row-icon ${iconClass}">${icon}</span>
      <span class="row-text task-name">${escapeHtml(t.command || t.name)}</span>
    </div>
  `;
  }).join('');
  return `<div class="section-content">${rows}</div>`;
}

export function renderTerminals(terminals: SidebarBackgroundTask[], isExpanded: boolean): string {
  if (!isExpanded) return '';
  if (terminals.length === 0) return '<div class="empty-item">No active terminals</div>';
  const rows = terminals.map((t) => `
    <div class="terminal-row" title="${escapeHtml(t.command || t.name)}">
      <span class="row-icon">${ICONS.terminal}</span>
      <span class="row-text terminal-name">${escapeHtml(t.name)}</span>
    </div>
  `).join('');
  return `<div class="section-content">${rows}</div>`;
}

export function renderSkills(skills: SidebarSkill[], isExpanded: boolean): string {
  if (!isExpanded) return '';
  if (skills.length === 0) return '<div class="empty-item">No skills used</div>';
  const rows = skills.map((s) => `
    <div class="skill-row" data-open-skill="${escapeHtml(s.path)}" title="${escapeHtml(s.path)}">
      <span class="row-icon">${ICONS.document}</span>
      <span class="skill-name">${escapeHtml(s.name)}</span>
      <span class="skill-path">${escapeHtml(s.path)}</span>
    </div>
  `).join('');
  return `<div class="section-content">${rows}</div>`;
}
