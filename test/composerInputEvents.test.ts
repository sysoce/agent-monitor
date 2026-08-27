import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { handleComposerKeydown } from '../src/ui/composerInputEvents';
import type { AppState } from '../src/ui/types';

function createMockState(overrides: Partial<AppState> = {}): AppState {
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
    ...overrides,
  };
}

test('handleComposerKeydown sends message on Enter when mention dropdown is closed', () => {
  let sent = false;
  let prevented = false;
  const state = createMockState({ isMentionOpen: false });

  const event: any = {
    key: 'Enter',
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    isComposing: false,
    preventDefault: () => { prevented = true; },
  };

  const handled = handleComposerKeydown(event, state, {
    onSendMessage: () => { sent = true; },
  });

  assert.equal(handled, true);
  assert.equal(prevented, true);
  assert.equal(sent, true);
});

test('handleComposerKeydown allows newline on Shift+Enter', () => {
  let sent = false;
  let prevented = false;
  const state = createMockState({ isMentionOpen: false });

  const event: any = {
    key: 'Enter',
    shiftKey: true,
    metaKey: false,
    ctrlKey: false,
    isComposing: false,
    preventDefault: () => { prevented = true; },
  };

  const handled = handleComposerKeydown(event, state, {
    onSendMessage: () => { sent = true; },
  });

  assert.equal(handled, false);
  assert.equal(prevented, false);
  assert.equal(sent, false);
});

test('handleComposerKeydown ignores Enter during IME / mobile composition', () => {
  let sent = false;
  const state = createMockState({ isMentionOpen: false });

  const event: any = {
    key: 'Enter',
    shiftKey: false,
    isComposing: true,
    preventDefault: () => {},
  };

  const handled = handleComposerKeydown(event, state, {
    onSendMessage: () => { sent = true; },
  });

  assert.equal(handled, false);
  assert.equal(sent, false);
});

test('handleComposerKeydown yields to mention dropdown when open', () => {
  let sent = false;
  const state = createMockState({ isMentionOpen: true });

  const event: any = {
    key: 'Enter',
    shiftKey: false,
    isComposing: false,
    preventDefault: () => {},
  };

  const handled = handleComposerKeydown(event, state, {
    onSendMessage: () => { sent = true; },
  });

  assert.equal(handled, false, 'Should yield to mention dropdown when isMentionOpen is true');
  assert.equal(sent, false);
});
