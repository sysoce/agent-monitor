import { escapeHtml, renderMarkdownDocument } from './markdown';

export interface SubagentCardOptions {
  id?: string;
  role: string;
  type?: string;
  prompt?: string;
  status?: 'running' | 'completed' | 'failed' | 'idle' | 'aborted';
  result?: unknown;
  expanded?: boolean;
}

const SPINNER_SVG = `<svg class="task-spinner subagent-spinner" viewBox="0 0 16 16" width="14" height="14" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/></svg>`;
const CHECK_SVG = `<svg class="task-icon--completed subagent-completed" viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const FAIL_SVG = `<svg class="task-icon--failed" viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

export function renderSubagentCard(opts: SubagentCardOptions): string {
  const isRunning = opts.status === 'running';
  const isCompleted = opts.status === 'completed' || opts.status === 'idle';
  const isFailed = opts.status === 'failed' || opts.status === 'aborted';
  const isExpanded = Boolean(opts.expanded);

  const role = escapeHtml(opts.role || 'Subagent');
  const prompt = opts.prompt ? escapeHtml(opts.prompt) : '';
  const idAttr = opts.id ? ` data-subagent-id="${escapeHtml(opts.id)}"` : '';

  const statusIcon = isRunning ? SPINNER_SVG : isCompleted ? CHECK_SVG : isFailed ? FAIL_SVG : '';

  let bodyContent = '';
  if (prompt) {
    bodyContent += `<div class="subagent-prompt-block"><span class="subagent-prompt-label">Goal:</span> <span class="subagent-prompt-text">${prompt}</span></div>`;
  }
  if (opts.result != null) {
    const resText = typeof opts.result === 'object' ? JSON.stringify(opts.result, null, 2) : String(opts.result);
    bodyContent += `<div class="subagent-result-block"><div class="subagent-result-label">Result:</div><pre class="activity-toggle-output"><code>${escapeHtml(resText)}</code></pre></div>`;
  }

  return `
    <div class="activity-toggle activity-toggle--subagent subagent-card ${isRunning ? 'activity-toggle--live' : ''} ${isExpanded ? 'expanded' : ''}"${idAttr}>
      <button type="button" class="activity-toggle-header">
        <div class="activity-toggle-left">
          <span class="subagent-bot-icon">🤖</span>
          <span class="subagent-role-badge">${role}</span>
          ${prompt ? `<span class="activity-toggle-label subagent-prompt-preview">${prompt}</span>` : ''}
        </div>
        <div class="activity-toggle-right">
          ${statusIcon ? `<span class="subagent-status-icon">${statusIcon}</span>` : ''}
          <span class="activity-toggle-chevron">›</span>
        </div>
      </button>
      <div class="activity-toggle-body">
        ${bodyContent}
      </div>
    </div>
  `;
}
