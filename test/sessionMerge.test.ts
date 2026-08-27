import test from 'node:test';
import * as assert from 'node:assert/strict';
import { appendOptimisticUserMessage, mergeSessionDetail } from '../src/ui/sessionMerge';
import type { AppState } from '../src/ui/types';
import type { SessionDetail } from '../src/server/types';

test('appendOptimisticUserMessage creates activeSession if null and appends message', () => {
  const state: AppState = {
    activeTab: 'chat',
    syncMode: 'live-sse',
    activeSessionId: undefined,
    activeSession: undefined,
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'test-model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  appendOptimisticUserMessage(state, 'Hello optimistic world');
  assert.ok(state.activeSessionId);
  assert.ok(state.activeSession);
  assert.equal(state.activeSession.messages.length, 1);
  assert.equal(state.activeSession.messages[0]?.content, 'Hello optimistic world');
  assert.equal(state.activeSession.messages[0]?.role, 'user');
});

test('mergeSessionDetail preserves pending optimistic user messages not yet on server', () => {
  const existing: SessionDetail = {
    id: 'sess-1',
    title: 'Session 1',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 1000,
    messages: [
      { role: 'user', content: 'First user message' },
      { role: 'assistant', content: 'First assistant reply' },
      { role: 'user', content: 'Second user message (optimistic)', timestamp: Date.now() } as any,
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const incoming: SessionDetail = {
    id: 'sess-1',
    title: 'Session 1',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 1000,
    messages: [
      { role: 'user', content: 'First user message' },
      { role: 'assistant', content: 'First assistant reply' },
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const merged = mergeSessionDetail(existing, incoming);
  assert.equal(merged.messages.length, 3);
  assert.equal(merged.messages[2]?.content, 'Second user message (optimistic)');
});

test('mergeSessionDetail does not duplicate messages when incoming contains the user message', () => {
  const existing: SessionDetail = {
    id: 'sess-1',
    title: 'Session 1',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 1000,
    messages: [
      { role: 'user', content: 'First user message' },
      { role: 'assistant', content: 'First assistant reply' },
      { role: 'user', content: 'Second user message', timestamp: Date.now() } as any,
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const incoming: SessionDetail = {
    id: 'sess-1',
    title: 'Session 1',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 1000,
    messages: [
      { role: 'user', content: 'First user message' },
      { role: 'assistant', content: 'First assistant reply' },
      { role: 'user', content: 'Second user message' },
      { role: 'assistant', content: 'Second assistant reply' },
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const merged = mergeSessionDetail(existing, incoming);
  assert.equal(merged.messages.length, 4);
});

test('mergeSessionDetail recovers pending inbox messages when existing is undefined (after page refresh)', () => {
  const incoming: SessionDetail = {
    id: 'sess-1',
    title: 'Session 1',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 1000,
    messages: [
      { role: 'user', content: 'First user message' },
      { role: 'assistant', content: 'First assistant reply' },
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const inbox = [
    { id: 'inbox-1', sessionId: 'sess-1', content: 'Pending inbox message', role: 'user' as const, timestamp: Date.now() },
  ];

  const merged = mergeSessionDetail(undefined, incoming, inbox);
  assert.equal(merged.messages.length, 3);
  assert.equal(merged.messages[2]?.content, 'Pending inbox message');
  assert.equal(merged.messages[2]?.role, 'user');
});

