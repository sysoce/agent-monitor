import test from 'node:test';
import * as assert from 'node:assert/strict';
import { formatInlineMarkdown } from '../src/ui/components/markdown';
import { renderChatView } from '../src/ui/components/chatView';
import type { AppState } from '../src/ui/types';

test('formatInlineMarkdown converts plan.md and markdown plan links to clickable plan buttons', () => {
  const plain = formatInlineMarkdown('Please see plan.md for details');
  assert.match(plain, /data-plan-path="plan\.md"/);
  assert.match(plain, /md-plan-link/);

  const mdLink = formatInlineMarkdown('Created [Implementation Plan](docs/sample.plan.md)');
  assert.match(mdLink, /data-plan-path="docs\/sample\.plan\.md"/);
  assert.match(mdLink, /Implementation Plan/);
});

test('renderChatView renders plan box and todo box even in agent mode', () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [],
    activeSessionId: 's1',
    activeSession: {
      id: 's1',
      title: 'Plan session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [
        {
          role: 'assistant',
          content: 'Here is the plan:\nplan.md',
          planMeta: { title: 'True North Plan', overview: 'Step by step', path: 'plan.md' },
          todos: [{ id: '1', title: 'Implement feature', status: 'pending' }],
        } as any,
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      plans: [],
    },
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    plans: [],
    isSending: false,
    isAuthenticated: true,
  };

  const html = renderChatView(state);
  assert.match(html, /plan-card/);
  assert.match(html, /True North Plan/);
  assert.match(html, /data-plan-path="plan\.md"/);
  assert.match(html, /todos-card/);
  assert.match(html, /Implement feature/);
});
