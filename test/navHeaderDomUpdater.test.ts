import test from 'node:test';
import * as assert from 'node:assert/strict';
import { updateNavHeaderDOM } from '../src/ui/navHeaderDomUpdater';
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

test('updateNavHeaderDOM initializes header when container is empty', () => {
  let innerHtml = '';
  const container: any = {
    querySelector: () => null,
    set innerHTML(val: string) { innerHtml = val; },
    get innerHTML() { return innerHtml; },
  };

  const state = createMockState();
  updateNavHeaderDOM(state, container);

  assert.ok(innerHtml.includes('class="app-header"'));
  assert.ok(innerHtml.includes('Live SSE'));
  assert.ok(innerHtml.includes('data-tab="sidebar"'));
});

test('updateNavHeaderDOM updates status pill and tab badges in-place without replacing header', () => {
  let headerReplaced = false;

  const dotEl: any = { style: { backgroundColor: '#4ec9b0' } };
  const statusTextEl: any = { textContent: 'Live SSE' };
  const statusPill: any = {
    className: 'status-pill status-live',
    querySelector(sel: string) {
      if (sel === '.status-dot') return dotEl;
      if (sel === '.status-text') return statusTextEl;
      return null;
    },
  };

  const sidebarBadge: any = { textContent: '1' };
  const sidebarTabBtn: any = {
    classList: {
      toggle(cls: string, val: boolean) {
        if (cls === 'active') sidebarTabBtn.isActive = val;
      },
    },
    setAttribute(attr: string, val: string) { sidebarTabBtn[attr] = val; },
    querySelector(sel: string) {
      if (sel === '.tab-badge') return sidebarBadge;
      return null;
    },
  };

  const chatTabSpan: any = { textContent: 'Chat' };
  const chatTabBtn: any = {
    firstElementChild: chatTabSpan,
    classList: {
      toggle(cls: string, val: boolean) {
        if (cls === 'active') chatTabBtn.isActive = val;
      },
    },
    setAttribute(attr: string, val: string) { chatTabBtn[attr] = val; },
    querySelector() { return null; },
    insertAdjacentHTML() {},
  };

  const headerEl: any = {
    querySelector(sel: string) {
      if (sel === '#btn-toggle-sync') return statusPill;
      if (sel === 'button[data-tab="sidebar"]') return sidebarTabBtn;
      if (sel === 'button[data-tab="chat"]') return chatTabBtn;
      return null;
    },
  };

  const container: any = {
    querySelector(sel: string) {
      if (sel === '.app-header') return headerEl;
      return null;
    },
    set innerHTML(_val: string) {
      headerReplaced = true;
    },
  };

  const state = createMockState({
    syncStatus: 'syncing',
    activeTab: 'chat',
    sessions: [
      { id: 'sess_1', title: 'Session 1', preview: 'Prev 1', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 2 },
      { id: 'sess_2', title: 'Session 2', preview: 'Prev 2', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 0 },
    ],
  });

  updateNavHeaderDOM(state, container);

  assert.equal(headerReplaced, false, 'Header should NOT be replaced');
  assert.equal(statusPill.className, 'status-pill status-syncing');
  assert.equal(statusTextEl.textContent, 'Syncing');
  assert.equal(sidebarBadge.textContent, '2');
  assert.equal(sidebarTabBtn.isActive, false);
  assert.equal(chatTabBtn.isActive, true);
});
