import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderComposerView } from '../src/ui/components/composerView';
import { updateComposerButton } from '../src/ui/composerButton';
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
  assert.ok(!html.includes('id="btn-send"'), 'Does NOT render separate Send button ID side by side');
});

test('renderComposerView renders Send button when running but user has typed a message', () => {
  const html = renderComposerView(createMockState({ composerDraft: 'next instruction' }, true));
  assert.ok(html.includes('id="btn-send"'), 'Renders Send button when user is typing during active run');
  assert.ok(!html.includes('stop-mode'), 'Button does not have stop-mode class when typing');
  assert.ok(!html.includes('id="btn-stop"'), 'Does not render separate Stop button ID side by side');
});

test('renderComposerView renders Send button when running but user has attachments', () => {
  const html = renderComposerView(createMockState({
    composerDraft: '',
    attachments: [{ id: 'a1', type: 'file', label: 'test.ts', path: 'test.ts' }],
  }, true));
  assert.ok(html.includes('id="btn-send"'), 'Renders Send button when user has attachments');
  assert.ok(!html.includes('stop-mode'), 'Button does not have stop-mode');
});

test('renderComposerView renders only Send button when idle', () => {
  const html = renderComposerView(createMockState({}, false));
  assert.ok(!html.includes('id="btn-stop"'), 'Does not render Stop button when idle');
  assert.ok(html.includes('id="btn-send"'), 'Renders Send button when idle');
  assert.ok(!html.includes('stop-mode'), 'Button does not have stop-mode when idle');
});

test('updateComposerButton dynamically updates button attributes and icons in DOM', () => {
  const mockSendIcon = { classList: { toggle: (cls: string, val: boolean) => {} } };
  const mockStopIcon = { classList: { toggle: (cls: string, val: boolean) => {} } };
  const mockBtn: any = {
    id: 'btn-send',
    className: 'send-btn btn-send',
    title: 'Send (Enter)',
    attrs: {} as Record<string, string>,
    setAttribute: (k: string, v: string) => { mockBtn.attrs[k] = v; },
    querySelector: (sel: string) => (sel === '.send-icon' ? mockSendIcon : sel === '.stop-icon' ? mockStopIcon : null),
  };
  const mockTextarea: any = { value: '' };

  const mockDoc: any = {
    querySelector: (sel: string) => mockBtn,
    getElementById: (id: string) => (id === 'composer-input' ? mockTextarea : null),
  };

  const state = createMockState({}, true);

  // Empty input + generating => stop-mode
  updateComposerButton(state, mockDoc);
  assert.equal(mockBtn.id, 'btn-stop');
  assert.ok(mockBtn.className.includes('stop-mode'));
  assert.equal(mockBtn.title, 'Stop (Immediate stop)');

  // Typing text + generating => send mode
  mockTextarea.value = 'hello';
  updateComposerButton(state, mockDoc);
  assert.equal(mockBtn.id, 'btn-send');
  assert.ok(!mockBtn.className.includes('stop-mode'));
  assert.equal(mockBtn.title, 'Send (Enter)');
});


