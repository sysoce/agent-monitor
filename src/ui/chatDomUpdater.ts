import type { AppState } from './types';
import { renderChatView } from './components/chatView';
import { groupMessagesIntoTurns } from './components/turnGrouper';
import {
  renderAssistantTurn,
  renderUserTurn,
  renderGeneratingIndicator,
} from './components/chatTurnRenderer';
import { renderTelemetryCard } from './components/telemetryCard';
import { renderBackgroundTasksCard } from './components/backgroundTasksCard';
import { hydrateAllDiagrams } from './markdown/diagram/diagramHydrator';

function updateChatCards(session: any, messagesEl: HTMLElement): void {
  const metrics = session.metrics;
  const nextTelemetryHtml = metrics ? renderTelemetryCard(metrics) : '';
  const currentTelemetry = messagesEl.querySelector<HTMLElement>('.telemetry-card');
  if (currentTelemetry && nextTelemetryHtml) {
    if (currentTelemetry.dataset.renderedHtml !== nextTelemetryHtml) {
      currentTelemetry.outerHTML = nextTelemetryHtml;
    }
  }

  const nextBgHtml = session.backgroundTasks?.length ? renderBackgroundTasksCard(session.backgroundTasks) : '';
  const currentBg = messagesEl.querySelector<HTMLElement>('.bg-tasks-container');
  if (currentBg && nextBgHtml) {
    if (currentBg.dataset.renderedHtml !== nextBgHtml) {
      currentBg.outerHTML = nextBgHtml;
    }
  }
}

export function updateChatDOM(state: AppState, container: HTMLElement): void {
  if (state.activePlan) {
    const nextHtml = renderChatView(state);
    container.innerHTML = nextHtml;
    if (container.dataset) container.dataset.renderedHtml = nextHtml;
    return;
  }

  const session = state.activeSession;
  const currentSessionId = session?.id || state.activeSessionId || '';
  const chatContainer = container.querySelector<HTMLElement>('.chat-container');
  const messagesEl = chatContainer?.querySelector<HTMLElement>('#chat-messages-container');

  if (!chatContainer || !messagesEl || container.dataset?.activeSessionId !== currentSessionId) {
    const nextHtml = renderChatView(state);
    container.innerHTML = nextHtml;
    if (container.dataset) {
      container.dataset.activeSessionId = currentSessionId;
      container.dataset.renderedHtml = nextHtml;
    }
    const initialTurns = typeof container.querySelectorAll === 'function' ? container.querySelectorAll<HTMLElement>('.turn') : [];
    for (const t of Array.from(initialTurns)) {
      if (t.dataset) t.dataset.renderedHtml = t.outerHTML;
    }
    return;
  }

  if (!session) return;

  updateChatCards(session, messagesEl);

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
  const expectedTurnHtmls: string[] = visibleTurns.map((msg) =>
    msg.role === 'user' ? renderUserTurn(msg) : renderAssistantTurn(msg, state.composerMode === 'agent')
  );

  if (isGenerating && !hasLiveAssistantTurn) {
    expectedTurnHtmls.push(renderGeneratingIndicator());
  }

  const emptyEl = messagesEl.querySelector<HTMLElement>('.conversation-empty');
  if (emptyEl && expectedTurnHtmls.length > 0) {
    emptyEl.remove();
  }

  const existingTurns = Array.from(messagesEl.querySelectorAll<HTMLElement>('.turn'));

  for (let i = 0; i < expectedTurnHtmls.length; i++) {
    const expectedHtml = expectedTurnHtmls[i]!;
    const existing = existingTurns[i];

    if (existing) {
      if (!existing.dataset?.renderedHtml && existing.outerHTML === expectedHtml) {
        if (existing.dataset) existing.dataset.renderedHtml = expectedHtml;
      } else if (existing.dataset?.renderedHtml !== expectedHtml) {
        existing.outerHTML = expectedHtml;
        const allTurns = messagesEl.querySelectorAll<HTMLElement>('.turn');
        const updatedTurn = allTurns ? allTurns[i] : null;
        if (updatedTurn) {
          if (updatedTurn.dataset) updatedTurn.dataset.renderedHtml = expectedHtml;
          hydrateAllDiagrams(updatedTurn);
        }
      }
    } else if (typeof messagesEl.insertAdjacentHTML === 'function') {
      messagesEl.insertAdjacentHTML('beforeend', expectedHtml);
      const newTurn = messagesEl.lastElementChild as HTMLElement | null;
      if (newTurn) {
        if (newTurn.dataset) newTurn.dataset.renderedHtml = expectedHtml;
        hydrateAllDiagrams(newTurn);
      }
    }
  }

  if (existingTurns.length > expectedTurnHtmls.length) {
    for (let i = expectedTurnHtmls.length; i < existingTurns.length; i++) {
      existingTurns[i]?.remove();
    }
  }

  if (container.dataset) container.dataset.renderedHtml = renderChatView(state);
}
