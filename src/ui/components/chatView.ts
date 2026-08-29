import type { AppState } from '../types';
import { escapeHtml } from './markdown';
import { renderPlanView } from './planView';
import { renderBackgroundTasksCard } from './backgroundTasksCard';
import { renderShellApprovalCard } from './shellApprovalCard';
import { renderTelemetryCard } from './telemetryCard';
import { groupMessagesIntoTurns } from './turnGrouper';
import { renderConnectionNotice } from './connectionNotice';
import {
  renderAssistantTurn,
  renderUserTurn,
  renderGeneratingIndicator,
  renderSessionLoadingIndicator,
} from './chatTurnRenderer';

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
