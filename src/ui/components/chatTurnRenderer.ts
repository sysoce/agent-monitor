import type { ChatMessage, ToolCall, AttachmentItem } from '../../types';
import { escapeHtml, renderMarkdownDocument } from './markdown';
import { renderThought, renderToolCard, renderPlanCard, renderWalkthroughCard } from './activityView';
import { renderTodosCard, type TodoItem } from './todosCard';
import { renderAttachmentPill } from './attachmentPill';
import { renderMessageCopyActionsHtml } from '../copyActions';

export function extractText(msg: ChatMessage | Record<string, unknown>): string {
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return (msg.content as unknown[])
      .map((p: unknown) => (typeof p === 'string' ? p : (p as { text?: string })?.text || ''))
      .filter(Boolean)
      .join('\n');
  }
  return typeof (msg as Record<string, unknown>).text === 'string' ? ((msg as Record<string, unknown>).text as string) : '';
}

export function renderAssistantTurn(msg: ChatMessage, isBuildMode = false): string {
  const text = extractText(msg);
  const thought = (msg as { thought?: string; thinking?: string }).thought ?? (msg as { thought?: string; thinking?: string }).thinking;
  const isLive = Boolean((msg as { isLive?: boolean }).isLive);
  const toolCalls = (msg.tool_calls || (msg as { toolCalls?: ToolCall[] }).toolCalls || []) as Array<ToolCall & { result?: unknown }>;
  const planMeta = (msg as { planMeta?: { title?: string; overview?: string; path?: string } }).planMeta;
  const walkthroughMeta = (msg as { walkthroughMeta?: { title?: string; summary?: string; path?: string } }).walkthroughMeta;
  const todos = (msg as { todos?: TodoItem[] }).todos;
  const isErr = (msg as { isError?: boolean }).isError || text.includes('**Model Error:**');

  let bodyHtml = '';
  if (isErr) {
    const idx = text.indexOf('**Model Error:**');
    const textPart = idx > 0 ? text.slice(0, idx).replace(/⚠️\s*$/, '').trim() : '';
    const errPart = idx >= 0 ? text.slice(idx).replace(/^\*\*Model Error:\*\*\s*/, '').trim() : text;
    if (textPart) bodyHtml += `<div class="msg assistant"><div class="msg-text">${renderMarkdownDocument(textPart)}</div></div>`;
    bodyHtml += `<div class="msg-error-card"><div class="msg-error-header"><span class="msg-error-icon">⚠️</span><span class="msg-error-title">Model Request Failed</span></div><div class="msg-error-body">${escapeHtml(errPart)}</div></div>`;
  } else if (text.trim()) {
    bodyHtml = `<div class="msg assistant"><div class="msg-text">${renderMarkdownDocument(text)}</div></div>`;
  } else if (!thought && toolCalls.length === 0 && !planMeta && !walkthroughMeta && (!todos || todos.length === 0)) {
    return isLive ? renderGeneratingIndicator() : '';
  }

  const timestamp = (msg as { timestamp?: string | number | Date }).timestamp ?? (msg as { time?: string | number | Date }).time;
  const copyHtml = bodyHtml && !isLive ? renderMessageCopyActionsHtml({ user: false, copyText: text, time: timestamp }) : '';

  return `
    <div class="turn turn-assistant${isLive ? ' turn--generating' : ''}">
      ${renderThought(thought, { isLive, expanded: isLive })}
      ${toolCalls.length > 0 ? `<div class="tool-calls-container">${toolCalls.map(renderToolCard).join('')}</div>` : ''}
      ${planMeta ? renderPlanCard(planMeta) : ''}
      ${walkthroughMeta ? renderWalkthroughCard(walkthroughMeta) : ''}
      ${todos && todos.length > 0 ? renderTodosCard(todos, { isBuild: isBuildMode }) : ''}
      ${bodyHtml}
      ${copyHtml}
    </div>
  `;
}

export function renderUserTurn(msg: ChatMessage): string {
  const text = extractText(msg);
  const rawAtts: AttachmentItem[] = [...((msg as { attachments?: AttachmentItem[] }).attachments || [])];
  const rawImages = (msg as { images?: Array<{ path?: string; label?: string; uri?: string; content?: string }> }).images || [];
  for (const img of rawImages) {
    if (!rawAtts.some((a) => (img.path && a.path === img.path) || (img.label && a.label === img.label))) {
      rawAtts.push({
        id: `img-${Math.random().toString(36).slice(2, 7)}`,
        type: 'image',
        label: img.label || img.path?.split('/').pop() || 'image',
        path: img.path,
        uri: img.uri,
        content: img.content,
      });
    }
  }
  const attsHtml = rawAtts.length > 0 ? `<div class="msg-attachments">${rawAtts.map((a) => renderAttachmentPill(a, false)).join('')}</div>` : '';
  const timestamp = (msg as { timestamp?: string | number | Date }).timestamp ?? (msg as { time?: string | number | Date }).time;
  const copyHtml = renderMessageCopyActionsHtml({ user: true, copyText: text, time: timestamp });
  return `<div class="turn turn-user"><div class="msg user">${attsHtml}<div class="msg-user-text">${escapeHtml(text)}</div></div>${copyHtml}</div>`;
}

export function renderGeneratingIndicator(): string {
  return `<div class="turn turn-assistant turn--generating"><div class="stream-loading"><span class="stream-loading-dot"></span><span class="stream-loading-dot"></span><span class="stream-loading-dot"></span></div></div>`;
}

export function renderSessionLoadingIndicator(): string {
  return `<div class="session-loading-state" aria-live="polite" aria-busy="true"><div class="session-loading-spinner"><svg class="task-spinner-icon" viewBox="0 0 16 16" width="22" height="22" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/></svg></div><div class="session-loading-text">Loading session...</div></div>`;
}
