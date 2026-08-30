import test from 'node:test';
import * as assert from 'node:assert/strict';
import { handleDelegatedClick } from '../src/ui/eventDelegation';
import type { AppState } from '../src/ui/types';

function createMockElement(attributes: Record<string, string> = {}, className = ''): any {
  const el = {
    className,
    getAttribute: (attr: string) => attributes[attr] || null,
    closest: (selector: string) => {
      const matchAttr = selector.match(/\[([a-zA-Z0-9_-]+)\]/);
      if (matchAttr && attributes[matchAttr[1]]) return el;
      const matchVal = selector.match(/\[([a-zA-Z0-9_-]+)="?([^"\]]+)"?\]/);
      if (matchVal && attributes[matchVal[1]] === matchVal[2]) return el;
      const matchClass = selector.match(/\.([a-zA-Z0-9_-]+)/);
      if (matchClass && className.includes(matchClass[1])) return el;
      return null;
    },
    querySelector: () => null,
    classList: {
      toggle: () => {},
      contains: () => false,
    },
  };
  return el;
}

test('handleDelegatedClick on data-filter-tab updates state.activeFilterTab and calls onRender', () => {
  let rendered = false;
  const state: AppState = {
    activeTab: 'sidebar',
    activeFilterTab: 'all',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const callbacks: any = {
    onRender: () => { rendered = true; },
  };

  const target = createMockElement({ 'data-filter-tab': 'running' }, 'stat-card');
  const handled = handleDelegatedClick(target, state, callbacks);

  assert.equal(handled, true);
  assert.equal(state.activeFilterTab, 'running');
  assert.equal(rendered, true);
});

test('handleDelegatedClick on data-pin-id toggles pinned session', () => {
  let rendered = false;
  const state: AppState = {
    activeTab: 'sidebar',
    activeFilterTab: 'all',
    sessions: [],
    pinnedSessionIds: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const callbacks: any = {
    onRender: () => { rendered = true; },
  };

  const target = createMockElement({ 'data-pin-id': 'sess_xyz' }, 'pin-session-btn session-row-action');
  const handled = handleDelegatedClick(target, state, callbacks);

  assert.equal(handled, true);
  assert.equal(state.pinnedSessionIds?.includes('sess_xyz'), true);
  assert.equal(rendered, true);
});

test('handleDelegatedClick on session-item selects session', () => {
  let selectedId = '';
  const state: AppState = {
    activeTab: 'sidebar',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const callbacks: any = {
    onSelectSession: (id: string) => { selectedId = id; },
    onRender: () => {},
  };

  const target = createMockElement({ 'data-session-id': 'sess_123' }, 'session-item');
  const handled = handleDelegatedClick(target, state, callbacks);

  assert.equal(handled, true);
  assert.equal(selectedId, 'sess_123');
});
