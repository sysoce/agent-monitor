import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderComposerView } from '../src/ui/components/composerView';
import { updateComposerButton, isAgentRunning } from '../src/ui/composerButton';
import { handleControlClick } from '../src/ui/controlHandlers';
import type { AppState } from '../src/ui/types';

function createMockState(overrides: Partial<AppState> = {}, isGenerating = false): AppState {
  return {
    activeTab: 'chat',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'antigravity|gemini-3.7-flash-high|model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    attachments: [],
    activeSession: {
      id: 'sess-1',
      title: 'Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 1000,
      messages: [],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      isGenerating,
    },
    ...overrides,
  };
}

test('renderComposerView renders only Stop button when running and draft is empty', () => {
  const html = renderComposerView(createMockState({ composerDraft: '' }, true));
  assert.ok(html.includes('id="btn-stop"'), 'Renders Stop button ID when agent is generating without draft');
  assert.ok(html.includes('stop-mode'), 'Button has stop-mode class');
  assert.ok(!html.includes('id="btn-send"'), 'Does NOT render Send button when empty');
});

test('renderComposerView renders BOTH Stop and Send buttons when running and user has typed a message', () => {
  const html = renderComposerView(createMockState({ composerDraft: 'next instruction' }, true));
  assert.ok(html.includes('id="btn-stop"'), 'Stop button MUST be present even when typing');
  assert.ok(html.includes('stop-mode'), 'Stop button has stop-mode class');
  assert.ok(html.includes('id="btn-send"'), 'Send button is also present to queue next instruction');
});

test('renderComposerView renders BOTH Stop and Send buttons when running and user has attachments', () => {
  const html = renderComposerView(createMockState({
    composerDraft: '',
    attachments: [{ id: 'a1', type: 'file', label: 'test.ts', path: 'test.ts' }],
  }, true));
  assert.ok(html.includes('id="btn-stop"'), 'Stop button MUST be present when running with attachments');
  assert.ok(html.includes('id="btn-send"'), 'Send button is present when user has attachments');
});

test('renderComposerView renders Stop button when subagents are running', () => {
  const state = createMockState({
    activeSession: {
      id: 'sess-1',
      title: 'Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 1000,
      messages: [],
      filesChanged: [],
      artifacts: [],
      subagents: [{ id: 'sub-1', role: 'research', status: 'running' }],
      isGenerating: false,
    },
  }, false);
  const html = renderComposerView(state);
  assert.ok(html.includes('id="btn-stop"'), 'Stop button MUST be present when subagents are running');
  assert.equal(isAgentRunning(state), true, 'isAgentRunning returns true when subagents are running');
});

test('renderComposerView renders only Send button when idle', () => {
  const html = renderComposerView(createMockState({}, false));
  assert.ok(!html.includes('id="btn-stop"'), 'Does not render Stop button when idle');
  assert.ok(html.includes('id="btn-send"'), 'Renders Send button when idle');
  assert.ok(!html.includes('stop-mode'), 'Button does not have stop-mode when idle');
});

test('handleControlClick triggers onStopSession when Stop button is clicked even with draft text', () => {
  let stopped = false;
  let sent = false;
  const state = createMockState({ composerDraft: 'some text to send' }, true);
  const stopTarget: any = {
    id: 'btn-stop',
    classList: { contains: (c: string) => c === 'btn-stop' || c === 'stop-mode' },
    closest: (sel: string) => (sel.includes('btn-stop') ? stopTarget : null),
  };

  const handled = handleControlClick(stopTarget, state, {
    onSelectSession: () => {},
    onNewSession: () => {},
    onSendMessage: () => { sent = true; },
    onStopSession: () => { stopped = true; },
    onSelectPlan: () => {},
    onLoginSuccess: () => {},
    onRender: () => {},
  });

  assert.equal(handled, true);
  assert.equal(stopped, true, 'onStopSession MUST be called when clicking stop button');
  assert.equal(sent, false, 'onSendMessage MUST NOT be called when clicking stop button with draft text');
});


