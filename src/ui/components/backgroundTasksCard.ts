import { escapeHtml } from './markdown';

export interface BackgroundTaskItem {
  id: string;
  name: string;
  command?: string;
  status?: 'running' | 'completed' | 'failed' | 'done';
}

export interface BackgroundTasksOptions {
  collapsed?: boolean;
}

const SPINNER_SVG = `<svg class="task-spinner" viewBox="0 0 16 16" width="14" height="14" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/></svg>`;
const CHECK_SVG = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const FAIL_SVG = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

export function renderBackgroundTasksCard(
  tasks?: BackgroundTaskItem[],
  options?: BackgroundTasksOptions
): string {
  if (!tasks || tasks.length === 0) return '';

  const isCollapsed = Boolean(options?.collapsed);
  const runningCount = tasks.filter((t) => t.status === 'running' || !t.status).length;

  const taskItemsHtml = tasks.map((t) => {
    const isRunning = t.status === 'running' || !t.status;
    const isDone = t.status === 'completed' || t.status === 'done';
    const iconClass = isRunning ? 'task-icon--running task-spinner-icon' : isDone ? 'task-icon--completed task-check-icon' : 'task-icon--failed';
    const iconSvg = isRunning ? SPINNER_SVG : isDone ? CHECK_SVG : FAIL_SVG;
    const name = escapeHtml(t.name || t.command || t.id);

    return `
      <li class="task-item" data-task-id="${escapeHtml(t.id)}">
        <span class="task-icon ${iconClass}">${iconSvg}</span>
        <span class="task-text">${name}</span>
      </li>
    `;
  }).join('');

  return `
    <div class="background-tasks-card ${isCollapsed ? 'tasks-card--collapsed' : ''}" id="background-tasks-card">
      <div class="tasks-header">
        <button type="button" class="tasks-toggle-btn" id="btn-toggle-background-tasks" aria-expanded="${!isCollapsed}">
          <span class="tasks-chevron-wrapper">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6l4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="tasks-title">Background Tasks</span>
          <span class="tasks-badge">${runningCount}</span>
        </button>
        <button type="button" class="tasks-stop-btn" id="btn-stop-background-tasks" title="Stop all background tasks" aria-label="Stop all background tasks">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <rect x="3" y="3" width="10" height="10" rx="2"/>
          </svg>
        </button>
      </div>
      <ul class="background-tasks-list ${isCollapsed ? 'hidden' : ''}" id="background-tasks-list">
        ${taskItemsHtml}
      </ul>
    </div>
  `;
}
