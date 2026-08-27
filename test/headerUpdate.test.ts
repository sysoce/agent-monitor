import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderNavHeader } from '../src/ui/components/navHeader';
import type { AppState } from '../src/ui/types';

function createMockState(activeTab: 'sidebar' | 'chat' | 'plans' = 'sidebar'): AppState {
  return {
    activeTab,
    sessions: [
      { id: 's1', title: 'Main Feature', preview: '', createdAt: 1, updatedAt: 2, messageCount: 5 },
    ],
    plans: [],
    activeSessionId: 's1',
    activeSession: {
      id: 's1',
      title: 'Main Feature',
      mode: 'agent',
      createdAt: 1,
      updatedAt: 2,
      messages: [{ role: 'user', content: 'hello' }],
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
    isSending: false,
    isAuthenticated: true,
  };
}

test('renderNavHeader renders .app-header with active class on active tab', () => {
  const sidebarState = createMockState('sidebar');
  const sidebarHtml = renderNavHeader(sidebarState);
  assert.match(sidebarHtml, /class="app-header"/);
  assert.match(sidebarHtml, /data-tab="sidebar"[^>]*class="[^"]*active/);
  assert.equal(sidebarHtml.includes('data-tab="chat" role="tab" aria-selected="true"'), false);

  const chatState = createMockState('chat');
  const chatHtml = renderNavHeader(chatState);
  assert.match(chatHtml, /class="app-header"/);
  assert.match(chatHtml, /data-tab="chat"[^>]*class="[^"]*active/);
  assert.equal(chatHtml.includes('data-tab="sidebar" role="tab" aria-selected="true"'), false);
});

test('renderNavHeader renders session title and message badge for chat tab', () => {
  const state = createMockState('chat');
  const html = renderNavHeader(state);
  assert.match(html, /Main Feature \(s1\)/);
  assert.match(html, /<span class="tab-badge">1<\/span>/);
});
