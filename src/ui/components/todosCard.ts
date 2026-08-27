import { escapeHtml } from './markdown';

export interface TodoItem {
  id?: string;
  text?: string;
  title?: string;
  content?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'done' | string;
}

export interface TodoStatsResult {
  total: number;
  completed: number;
  inProgress: number;
  allFinished: boolean;
}

export function todoStats(todos: TodoItem[] = []): TodoStatsResult {
  let completed = 0;
  let inProgress = 0;
  for (const t of todos) {
    if (t.status === 'completed' || t.status === 'done') completed++;
    else if (t.status === 'in_progress') inProgress++;
  }
  return {
    total: todos.length,
    completed,
    inProgress,
    allFinished: todos.length > 0 && completed === todos.length,
  };
}

export function renderTodosCard(
  todos: TodoItem[] = [],
  opts: { isBuild?: boolean } = {}
): string {
  if (!todos || todos.length === 0) return '';
  const stats = todoStats(todos);
  const isBuild = Boolean(opts.isBuild);
  const title = isBuild ? 'Build Plan' : 'Tasks';

  const itemsHtml = todos
    .map((t) => {
      const isDone = t.status === 'completed' || t.status === 'done';
      const isInProg = t.status === 'in_progress';
      const statusClass = isDone ? 'is-done' : isInProg ? 'is-in-progress' : 'is-pending';
      const icon = isDone ? '✓' : isInProg ? '⏳' : '○';
      const text = t.title || t.text || t.content || '';
      return `
        <li class="todo-item ${statusClass}">
          <span class="todo-icon">${icon}</span>
          <span class="todo-title">${escapeHtml(text)}</span>
        </li>
      `;
    })
    .join('');

  return `
    <div class="todos-card ${isBuild ? 'todos-card--build' : ''}">
      <div class="todos-title-row">
        <span class="todos-title-text">${escapeHtml(title)}</span>
        <span class="todos-progress-label">${stats.completed}/${stats.total} completed</span>
      </div>
      <ul class="todos-list">
        ${itemsHtml}
      </ul>
    </div>
  `;
}
