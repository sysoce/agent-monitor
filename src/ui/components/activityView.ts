import type { ToolCall } from '../../types';
import { escapeHtml, renderMarkdownDocument } from './markdown';
import { formatToolSummary, extractCommandTags } from './toolSummary';
import { formatThoughtDuration } from '../../utils/thoughtCard';
import { tryExtractDiffOptions } from '../../utils/toolDiffHelper';
import { renderDiffCard } from './diffCard';
import { renderSubagentCard } from './subagentCard';

export { formatToolSummary, formatThoughtDuration };

export function renderThought(
  thought?: string,
  opts?: { durationSeconds?: number; isLive?: boolean; expanded?: boolean }
): string {
  if (!thought?.trim()) return '';
  const isLive = Boolean(opts?.isLive);
  const isExpanded = Boolean(opts?.expanded);

  return `
    <div class="activity-toggle activity-toggle--thought${isLive ? ' activity-toggle--live' : ''}${isExpanded ? ' expanded' : ''}">
      <button type="button" class="activity-toggle-header">
        <span class="activity-toggle-label">
          <span class="activity-toggle-title">${isLive ? 'Thinking…' : 'Thought'}</span>
          ${!isLive ? `<span class="activity-toggle-duration">${formatThoughtDuration(opts?.durationSeconds)}</span>` : ''}
        </span>
        <span class="activity-toggle-chevron">›</span>
      </button>
      <div class="activity-toggle-body">
        <div class="activity-toggle-thought-text">${renderMarkdownDocument(thought)}</div>
      </div>
    </div>
  `;
}

export function renderToolCard(
  tc: ToolCall & { result?: unknown; status?: string; expanded?: boolean }
): string {
  const diffOpts = tryExtractDiffOptions(tc.name || '', tc.args);
  if (diffOpts) {
    return renderDiffCard(diffOpts);
  }

  if (tc.name === 'invoke_subagent' && Array.isArray(tc.args?.Subagents)) {
    return (tc.args.Subagents as any[])
      .map((s) =>
        renderSubagentCard({
          id: tc.id,
          role: s.Role || s.role || 'Subagent',
          type: s.TypeName || s.type,
          prompt: s.Prompt || s.prompt,
          status: tc.status === 'running' ? 'running' : 'completed',
          result: tc.result,
          expanded: tc.expanded,
        })
      )
      .join('');
  }

  const isShell = /^(?:bash|run_command|execute_command|shell)$/i.test(tc.name || '');
  const isLive = tc.status === 'running';
  const isExpanded = Boolean(tc.expanded);
  const summary = formatToolSummary(tc.name || '', tc.args);
  const callId = tc.id ? escapeHtml(tc.id) : '';

  let tagsHtml = '';
  if (isShell && tc.args) {
    const cmdStr = String(tc.args.command ?? tc.args.CommandLine ?? tc.args.cmd ?? '');
    const tags = extractCommandTags(cmdStr);
    if (tags.length > 0) {
      tagsHtml = `<span class="tool-tag-list">${escapeHtml(tags.slice(0, 5).join(', '))}</span>`;
    }
  }

  let outStr = '';
  if (tc.result != null) {
    outStr = typeof tc.result === 'object' ? JSON.stringify(tc.result, null, 2) : String(tc.result);
  } else if (tc.args && Object.keys(tc.args).length > 0) {
    outStr = JSON.stringify(tc.args, null, 2);
  }

  return `
    <div class="activity-toggle activity-toggle--tool${isShell ? ' activity-toggle--shell' : ''}${isLive ? ' activity-toggle--live' : ''}${isExpanded ? ' expanded' : ''}"${callId ? ` data-call-id="${callId}"` : ''}>
      <button type="button" class="activity-toggle-header">
        <div class="activity-toggle-left">
          ${isShell ? '<span class="tool-prompt-icon">&gt;_</span>' : ''}
          <span class="activity-toggle-label">${escapeHtml(summary)}</span>
        </div>
        <div class="activity-toggle-right">
          ${tagsHtml}
          <span class="activity-toggle-chevron">›</span>
        </div>
      </button>
      <div class="activity-toggle-body">
        <pre class="activity-toggle-output"><code>${escapeHtml(outStr)}</code></pre>
      </div>
    </div>
  `;
}

export function renderPlanCard(
  plan: string | { title?: string; overview?: string; path?: string }
): string {
  const planObj = typeof plan === 'string' ? { path: plan, title: plan } : plan;
  const cleanPath = escapeHtml(planObj.path || '');
  const cleanTitle = escapeHtml(planObj.title || planObj.path || 'Plan');
  const cleanOverview = planObj.overview ? escapeHtml(planObj.overview) : '';

  return `
    <div class="plan-card" ${cleanPath ? `data-plan-path="${cleanPath}"` : ''}>
      <div class="plan-card-label">CREATED PLAN</div>
      <div class="plan-card-title" ${cleanPath ? `data-plan-path="${cleanPath}"` : ''}>${cleanTitle}</div>
      ${cleanOverview ? `<div class="plan-card-overview">${cleanOverview}</div>` : ''}
      <div class="plan-card-actions">
        ${cleanPath ? `<button type="button" class="plan-view-btn" data-plan-path="${cleanPath}">View Plan</button>` : ''}
        ${cleanPath ? `<button type="button" class="plan-build-btn" data-plan-path="${cleanPath}" data-plan-title="${cleanTitle}">⚡ Build with Agent</button>` : ''}
      </div>
    </div>
  `;
}

export function renderWalkthroughCard(meta: { title?: string; summary?: string; path?: string }): string {
  const cleanPath = escapeHtml(meta.path || '');
  const cleanTitle = escapeHtml(meta.title || 'Walkthrough');
  const cleanSummary = meta.summary ? escapeHtml(meta.summary) : '';

  return `
    <div class="walkthrough-card"${cleanPath ? ` data-walkthrough-path="${cleanPath}"` : ''}>
      <div class="walkthrough-card-label">Walkthrough</div>
      <div class="walkthrough-card-title"${cleanPath ? ` data-walkthrough-path="${cleanPath}"` : ''}>${cleanTitle}</div>
      ${cleanSummary ? `<div class="walkthrough-card-summary">${cleanSummary}</div>` : ''}
      <div class="walkthrough-card-actions">
        ${cleanPath ? `<button type="button" class="walkthrough-view-btn" data-walkthrough-path="${cleanPath}">View Walkthrough</button>` : ''}
      </div>
    </div>
  `;
}

