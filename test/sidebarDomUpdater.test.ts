import test from 'node:test';
import * as assert from 'node:assert/strict';
import { updateSidebarDOM } from '../src/ui/sidebarDomUpdater';
import type { AppState } from '../src/ui/types';

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'sidebar',
    sessions: [
      { id: 'sess_1', title: 'Session 1', preview: 'Prev 1', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 2 },
    ],
    plans: [],
    syncStatus: 'connected',
    syncMode: 'live-sse',
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

test('updateSidebarDOM initializes sidebar when container is empty', () => {
  let innerHtml = '';
  const container: any = {
    querySelector: () => null,
    set innerHTML(val: string) { innerHtml = val; },
    get innerHTML() { return innerHtml; },
    dataset: {},
  };

  const state = createMockState();
  updateSidebarDOM(state, container);

  assert.ok(innerHtml.includes('class="sidebar-view"'));
  assert.ok(innerHtml.includes('id="session-search"'));
  assert.ok(innerHtml.includes('class="session-list"'));
});

test('updateSidebarDOM updates session list and preserves search input element', () => {
  let searchInputDestroyed = false;
  const searchInput: any = {
    id: 'session-search',
    value: '',
  };

  let listInnerHtml = '';
  const sessionListEl: any = {
    className: 'session-list',
    dataset: { renderedHtml: 'old-list' },
    set innerHTML(val: string) { listInnerHtml = val; },
    get innerHTML() { return listInnerHtml; },
  };

  const sidebarEl: any = {
    className: 'sidebar-view',
    querySelector(sel: string) {
      if (sel === '#session-search') return searchInput;
      if (sel === '.session-list') return sessionListEl;
      if (sel === '.search-bar') return { appendChild: () => {}, querySelector: () => null };
      if (sel === '.section-divider span') return { textContent: '' };
      return null;
    },
    querySelectorAll() { return []; },
  };

  const container: any = {
    querySelector(sel: string) {
      if (sel === '.sidebar-view') return sidebarEl;
      return null;
    },
    set innerHTML(_val: string) {
      searchInputDestroyed = true;
    },
    dataset: {},
  };

  const state = createMockState({
    sessions: [
      { id: 'sess_1', title: 'Session 1', preview: 'Prev 1', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 2 },
      { id: 'sess_2', title: 'Session 2 Updated', preview: 'Prev 2', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 5 },
    ],
  });

  updateSidebarDOM(state, container);

  assert.equal(searchInputDestroyed, false, 'Search input must NOT be destroyed');
  assert.ok(listInnerHtml.includes('Session 2 Updated'));
  assert.equal(sessionListEl.dataset.renderedHtml, listInnerHtml);
});
