import test from 'node:test';
import * as assert from 'node:assert/strict';
import { groupMessagesIntoTurns } from '../src/ui/components/turnGrouper';
import { parseAndDeduplicateLines } from '../src/server/sessionFinder';
import { handleControlClick } from '../src/ui/controlHandlers';
import type { AppState } from '../src/ui/types';

test('groupMessagesIntoTurns preserves assistant turn when isError is true even if content is empty', () => {
  const messages: any[] = [
    { role: 'user', content: 'What is the status?' },
    { role: 'assistant', content: '', isError: true, error: 'Connection refused' },
  ];

  const turns = groupMessagesIntoTurns(messages, new Map(), false);
  assert.equal(turns.length, 2, 'Should keep error turn even if content is empty');
  const errorTurn = turns[1] as any;
  assert.equal(errorTurn.role, 'assistant');
  assert.equal(errorTurn.isError, true);
  assert.equal(Boolean(errorTurn.isLive), false, 'Error turn must not be marked live');
});

test('parseAndDeduplicateLines does not skip assistant messages with isError: true or error property', () => {
  const jsonl = [
    JSON.stringify({ role: 'user', content: 'Hello' }),
    JSON.stringify({ role: 'assistant', isError: true, error: 'Model failed to respond' }),
  ].join('\n');

  const messages = parseAndDeduplicateLines(jsonl);
  assert.equal(messages.length, 2, 'Must keep the assistant error message');
  assert.equal((messages[1] as any).isError, true);
  assert.equal((messages[1] as any).error, 'Model failed to respond');
});

test('handleControlClick opens settings when #btn-error-settings is clicked', () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'gemini-3.7-flash',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    isSettingsModalOpen: false,
  };

  let rendered = false;
  const callbacks: any = {
    onRender: () => { rendered = true; },
  };

  const fakeBtn = {
    closest: (selector: string) => (selector.includes('btn-error-settings') ? {} : null),
  } as unknown as HTMLElement;

  const handled = handleControlClick(fakeBtn, state, callbacks);
  assert.equal(handled, true);
  assert.equal(state.isSettingsModalOpen, true);
  assert.equal(rendered, true);
});

test('handleControlClick populates composer with last user prompt and calls onSendMessage when #btn-error-retry is clicked', () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [],
    activeSessionId: 'test-session',
    activeSession: {
      id: 'test-session',
      title: 'Test',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [
        { role: 'user', content: 'Fix the bug in parser' },
        { role: 'assistant', content: '⚠️ **Model Error:** Connection lost', isError: true } as any,
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerDraft: '',
    composerMode: 'agent',
    selectedModel: 'gemini-3.7-flash',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  let sent = false;
  const callbacks: any = {
    onSendMessage: () => { sent = true; },
    onRender: () => {},
  };

  const fakeBtn = {
    closest: (selector: string) => (selector.includes('btn-error-retry') ? {} : null),
  } as unknown as HTMLElement;

  const handled = handleControlClick(fakeBtn, state, callbacks);
  assert.equal(handled, true);
  assert.equal(state.composerDraft, 'Fix the bug in parser');
  assert.equal(sent, true);
});
