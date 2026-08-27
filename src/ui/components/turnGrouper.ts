import type { ChatMessage } from '../../types';
import type { ToolCall } from '../../types';

export interface ConsolidatedAssistantTurn {
  role: 'assistant';
  content: string;
  thought?: string;
  thinking?: string;
  tool_calls: Array<ToolCall & { result?: unknown }>;
  planMeta?: { title?: string; overview?: string; path?: string };
  walkthroughMeta?: { title?: string; summary?: string; path?: string };
  todos?: any[];
  isError?: boolean;
  isLive?: boolean;
  timestamp?: number | string | Date;
}

export type ConsolidatedTurn = ChatMessage | ConsolidatedAssistantTurn;

function extractRawText(msg: ChatMessage | Record<string, unknown>): string {
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map((p: unknown) => (typeof p === 'string' ? p : (p as { text?: string })?.text || '')).filter(Boolean).join('\n');
  }
  return typeof (msg as Record<string, unknown>).text === 'string' ? ((msg as Record<string, unknown>).text as string) : '';
}

export function groupMessagesIntoTurns(
  messages: ChatMessage[],
  toolResults: Map<string, unknown>,
  isGenerating = false
): ConsolidatedTurn[] {
  const result: ConsolidatedTurn[] = [];
  let currentAssistant: ConsolidatedAssistantTurn | null = null;

  const flushAssistant = (isLast = false) => {
    if (!currentAssistant) return;
    if (isGenerating && isLast) {
      currentAssistant.isLive = true;
    }
    const hasText = Boolean(currentAssistant.content && currentAssistant.content.trim());
    const hasThought = Boolean(currentAssistant.thought && currentAssistant.thought.trim());
    const hasTools = currentAssistant.tool_calls.length > 0;
    const hasMeta = Boolean(currentAssistant.planMeta || currentAssistant.walkthroughMeta || currentAssistant.todos?.length);
    if (hasText || hasThought || hasTools || hasMeta || currentAssistant.isLive) {
      result.push(currentAssistant);
    }
    currentAssistant = null;
  };

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    if (m.role === 'tool') continue;

    if (m.role === 'user') {
      flushAssistant();
      result.push(m);
      continue;
    }

    if (m.role === 'assistant') {
      const text = extractRawText(m);
      const thought = (m as { thought?: string; thinking?: string }).thought ?? (m as { thought?: string; thinking?: string }).thinking;
      const rawTools = (m.tool_calls || (m as { toolCalls?: ToolCall[] }).toolCalls || []) as Array<ToolCall & { result?: unknown }>;
      const mappedTools = rawTools.map((tc) => ({
        ...tc,
        result: tc.result ?? (tc.id ? toolResults.get(tc.id) : undefined),
      }));

      if (!currentAssistant) {
        currentAssistant = {
          role: 'assistant',
          content: text,
          thought: thought?.trim() || undefined,
          thinking: thought?.trim() || undefined,
          tool_calls: [...mappedTools],
          planMeta: (m as any).planMeta,
          walkthroughMeta: (m as any).walkthroughMeta,
          todos: (m as any).todos,
          isError: Boolean((m as any).isError),
          timestamp: (m as any).timestamp ?? (m as any).time,
        };
      } else {
        if (text) {
          currentAssistant.content = currentAssistant.content ? `${currentAssistant.content}\n\n${text}` : text;
        }
        if (thought?.trim()) {
          currentAssistant.thought = currentAssistant.thought ? `${currentAssistant.thought}\n\n${thought.trim()}` : thought.trim();
          currentAssistant.thinking = currentAssistant.thought;
        }
        if (mappedTools.length > 0) {
          currentAssistant.tool_calls.push(...mappedTools);
        }
        if ((m as any).planMeta) currentAssistant.planMeta = (m as any).planMeta;
        if ((m as any).walkthroughMeta) currentAssistant.walkthroughMeta = (m as any).walkthroughMeta;
        if ((m as any).todos) currentAssistant.todos = (m as any).todos;
        if ((m as any).isError) currentAssistant.isError = true;
      }
    }
  }

  flushAssistant(true);

  if (isGenerating && result.length > 0) {
    const last = result[result.length - 1];
    if (last && last.role === 'assistant') {
      last.isLive = true;
    }
  }

  return result;
}
