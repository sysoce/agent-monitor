import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { updateComposerDOM } from '../src/ui/composerDomUpdater';
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
    composerDraft: 'my draft message',
    ...overrides,
  };
}

test('updateComposerDOM preserves existing textarea instance without destroying DOM node', () => {
  const textareaObj = {
    id: 'composer-input',
    value: 'user is actively typing on mobile',
  };

  const mentionContainer = { id: 'mention-dropdown-container', innerHTML: '' };
  const modeText = { id: 'composer-mode-text', textContent: 'Agent' };
  const modeBtn = { id: 'btn-mode-toggle', className: 'mode-pill--agent', querySelector: (s: string) => (s === '#composer-mode-text' ? modeText : null) };
  const modelText = { id: 'composer-model-text', textContent: 'Gemini 3.7 Flash' };
  const modelWrapper = { className: 'model-picker-wrapper', querySelector: (s: string) => (s === '#composer-model-text' ? modelText : null), insertAdjacentHTML: () => {} };
  const sendBtn = {
    id: 'btn-send',
    className: 'send-btn btn-send',
    title: 'Send (Enter)',
    setAttribute: () => {},
    querySelector: () => ({ classList: { toggle: () => {} } }),
  };

  const composerEl: any = {
    querySelector: (sel: string) => {
      if (sel === '#composer-input') return textareaObj;
      if (sel === '#mention-dropdown-container') return mentionContainer;
      if (sel === '#btn-mode-toggle') return modeBtn;
      if (sel === '.model-picker-wrapper') return modelWrapper;
      if (sel.includes('.send-btn') || sel === '#btn-send') return sendBtn;
      if (sel === '#composer-attachments') return null;
      return null;
    },
  };

  const state = createMockState({ composerMode: 'plan' });
  updateComposerDOM(state, composerEl);

  assert.equal(textareaObj.value, 'user is actively typing on mobile', 'Preserves textarea value');
  assert.equal(modeText.textContent, 'Plan', 'Updates mode text in place');
  assert.ok(modeBtn.className.includes('mode-pill--plan'), 'Updates mode button class');
});

test('updateComposerDOM updates attachments container in place', () => {
  let insertedHtml = '';
  const textareaObj = { id: 'composer-input', value: '' };
  const composerCard = {
    querySelector: () => null,
  };
  const inputEl = {
    insertAdjacentHTML: (pos: string, html: string) => {
      if (pos === 'beforebegin') insertedHtml = html;
    },
  };

  const composerEl: any = {
    querySelector: (sel: string) => {
      if (sel === '#composer-input') return inputEl;
      if (sel === '.composer-card') return composerCard;
      if (sel === '#composer-attachments') return null;
      if (sel === '#mention-dropdown-container') return { innerHTML: '' };
      if (sel === '#btn-mode-toggle') return { querySelector: () => ({ textContent: '' }) };
      if (sel === '.model-picker-wrapper') return { querySelector: () => ({ textContent: '' }) };
      if (sel.includes('.send-btn')) return { setAttribute: () => {}, querySelector: () => ({ classList: { toggle: () => {} } }) };
      return null;
    },
  };

  const state = createMockState({
    attachments: [{ id: 'att-1', type: 'file', label: 'test.ts', path: 'test.ts' }],
  });

  updateComposerDOM(state, composerEl);
  assert.ok(insertedHtml.includes('test.ts'), 'Inserts attachments pill');
});
