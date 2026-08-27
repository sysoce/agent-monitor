import type { ChatMessage } from '../../types';
import type { ToolCall } from '../../types';
import type { AttachmentItem } from '../../types';
import type { AppState } from '../types';
import { escapeHtml, renderMarkdownDocument } from './markdown';
import { renderThought, renderToolCard, renderPlanCard, renderWalkthroughCard } from './activityView';
import { renderTodosCard, type TodoItem } from './todosCard';
import { renderAttachmentPill } from './attachmentPill';
import { renderPlanView } from './planView';
import { renderBackgroundTasksCard } from './backgroundTasksCard';
import { renderShellApprovalCard } from './shellApprovalCard';
import { renderTelemetryCard } from './telemetryCard';
import { renderMessageCopyActionsHtml } from '../copyActions';
import { groupMessagesIntoTurns } from './turnGrouper';
import { renderConnectionNotice } from './connectionNotice';

function extractText(msg: ChatMessage | Record<string, unknown>): string {
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) return (msg.content as unknown[]).map((p: unknown) => (typeof p === 'string' ? p : (p as { text?: string })?.text || '')).filter(Boolean).join('\n');
  return typeof (msg as Record<string, unknown>).text === 'string' ? ((msg as Record<string, unknown>).text as string) : '';
}

function renderAssistantTurn(msg: ChatMessage, isBuildMode = false): string {
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

function renderUserTurn(msg: ChatMessage): string {
  const text = extractText(msg);
  const atts = (msg as { attachments?: AttachmentItem[] }).attachments || [];
  const attsHtml = atts.length > 0 ? `<div class="msg-attachments">${atts.map((a) => renderAttachmentPill(a, false)).join('')}</div>` : '';
  const timestamp = (msg as { timestamp?: string | number | Date }).timestamp ?? (msg as { time?: string | number | Date }).time;
  const copyHtml = renderMessageCopyActionsHtml({ user: true, copyText: text, time: timestamp });
  return `<div class="turn turn-user"><div class="msg user">${attsHtml}<div class="msg-user-text">${escapeHtml(text)}</div></div>${copyHtml}</div>`;
}

function renderGeneratingIndicator(): string {
  return `<div class="turn turn-assistant turn--generating"><div class="stream-loading"><span class="stream-loading-dot"></span><span class="stream-loading-dot"></span><span class="stream-loading-dot"></span></div></div>`;
}

function renderSessionLoadingIndicator(): string {
  return `<div class="session-loading-state" aria-live="polite" aria-busy="true"><div class="session-loading-spinner"><svg class="task-spinner-icon" viewBox="0 0 16 16" width="22" height="22" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/></svg></div><div class="session-loading-text">Loading session...</div></div>`;
}

export function renderChatView(state: AppState): string {
  if (state.activePlan) {
    const planPath = escapeHtml(state.activePlan.path || state.activePlan.name);
    const planTitle = escapeHtml(state.activePlan.title || state.activePlan.name);
    return `
      <div class="chat-container">
        <div class="chat-plan-header">
          <div class="chat-plan-header-left">
            <button type="button" class="btn-back-chat" id="btn-back-to-chat">‹ Back to Chat</button>
            <span class="chat-plan-title">${planTitle}</span>
          </div>
          <button type="button" class="plan-build-btn" data-plan-path="${planPath}" data-plan-title="${planTitle}">⚡ Build with Agent</button>
        </div>
        <div class="chat-plan-scroll">${renderPlanView(state)}</div>
      </div>
    `;
  }

  const session = state.activeSession;
  if (!session) {
    if (state.isLoadingSession || state.activeSessionId) {
      return `<div class="chat-container"><div class="chat-scroll" id="chat-messages-container">${renderSessionLoadingIndicator()}</div></div>`;
    }
    return `<div class="chat-container"><div class="chat-scroll" id="chat-messages-container"><div class="conversation-empty"><div class="empty-icon">💬</div><div class="empty-title">Ask Agent to build or change code</div><div class="empty-hint">Type an instruction below to start this session.</div></div></div></div>`;
  }

  const messages = session.messages || [];
  const toolResults = new Map<string, unknown>();
  for (const m of messages) {
    if (m.role === 'tool' && (m as { tool_call_id?: string }).tool_call_id) {
      toolResults.set((m as { tool_call_id?: string }).tool_call_id!, m.content);
    }
  }

  const isGenerating = Boolean(session.isGenerating || (state.isAwaitingResponse && (!state.awaitingSessionId || state.awaitingSessionId === session.id)));
  const visibleTurns = groupMessagesIntoTurns(messages, toolResults, isGenerating);
  const hasLiveAssistantTurn = visibleTurns.some((t) => t.role === 'assistant' && Boolean((t as any).isLive));
  const generatingHtml = (isGenerating && !hasLiveAssistantTurn) ? renderGeneratingIndicator() : '';
  const isEmpty = visibleTurns.length === 0 && !isGenerating && (!session.pendingApprovals || session.pendingApprovals.length === 0);

  const backgroundTasksHtml = session.backgroundTasks && session.backgroundTasks.length > 0 ? renderBackgroundTasksCard(session.backgroundTasks) : '';
  const approvalsHtml = session.pendingApprovals && session.pendingApprovals.length > 0
    ? session.pendingApprovals.map((a) => renderShellApprovalCard({ commandId: a.commandId, command: a.command })).join('')
    : '';
   const metrics = (session as { metrics?: import('./telemetryCard').TelemetryData }).metrics;
   const telemetryHtml = metrics ? renderTelemetryCard(metrics) : '';
   const emptyOrLoadingHtml = state.isLoadingSession ? renderSessionLoadingIndicator()
     : `<div class="conversation-empty"><div class="empty-title">No messages in this session yet</div><div class="empty-hint">Type a message below to start working with Agent.</div></div>`;
   const connectionNoticeHtml = renderConnectionNotice(state);

  return `
    <div class="chat-container">
      <div class="chat-scroll" id="chat-messages-container">
        ${connectionNoticeHtml}
        ${telemetryHtml}
        ${backgroundTasksHtml}
        ${isEmpty ? emptyOrLoadingHtml
          : visibleTurns.map((msg) => (msg.role === 'user' ? renderUserTurn(msg) : renderAssistantTurn(msg, state.composerMode === 'agent'))).join('') + approvalsHtml + generatingHtml}
      </div>
    </div>
  `;
}
