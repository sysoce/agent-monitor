import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderNavHeader } from '../src/ui/components/navHeader';
import { renderChatView } from '../src/ui/components/chatView';
import { renderSidebarView } from '../src/ui/components/sidebarView';
import type { AppState } from '../src/ui/types';

const baseState: AppState = {
  activeTab: 'chat',
  sessions: [
    { id: 'sess-1', title: 'Plan Session Alpha', preview: 'Working on alpha', createdAt: 1000, updatedAt: 6000, messageCount: 2 },
    { id: 'sess-2', title: 'Plan Session Beta', preview: 'Working on beta', createdAt: 1000, updatedAt: 5000, messageCount: 3 },
    { id: 'sess-3', title: 'Plan Session Gamma', preview: 'Working on gamma', createdAt: 1000, updatedAt: 4000, messageCount: 1 },
    { id: 'sess-4', title: 'Plan Session Delta', preview: 'Working on delta', createdAt: 1000, updatedAt: 3000, messageCount: 4 },
    { id: 'sess-5', title: 'Plan Session Epsilon', preview: 'Working on epsilon', createdAt: 1000, updatedAt: 2000, messageCount: 5 },
    { id: 'sess-6', title: 'Plan Session Zeta', preview: 'Working on zeta', createdAt: 1000, updatedAt: 1000, messageCount: 6 },
    { id: 'sess-7', title: 'Old Session 7', preview: 'Old 7', createdAt: 500, updatedAt: 900, messageCount: 1 },
    { id: 'sess-8', title: 'Old Session 8', preview: 'Old 8', createdAt: 400, updatedAt: 800, messageCount: 1 },
    { id: 'sess-9', title: 'Old Session 9', preview: 'Old 9', createdAt: 300, updatedAt: 700, messageCount: 1 },
  ],
  activeSessionId: 'sess-1',
  activeSession: {
    id: 'sess-1',
    title: 'Plan Session Alpha',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 6000,
    messages: [
      { role: 'user', content: 'Create a plan with some todos' },
      { role: 'assistant', content: 'Here is your plan in sample_plan.md' },
    ],
    filesChanged: [{ path: 'src/main.ts', status: 'modified' }],
    artifacts: [{ name: 'sample_plan.md', path: 'sample_plan.md', type: 'plan' }],
    subagents: [],
    plans: [],
  },
  plans: [{ name: 'sample_plan.md', title: 'Sample Plan', path: 'sample_plan.md', updatedAt: 6000, sizeBytes: 500 }],
  availableModels: [],
  syncStatus: 'connected',
  searchQuery: '',
  composerMode: 'agent',
  selectedModel: 'gpt-4o',
  isSending: false,
  isAuthenticated: true,
};

test('renderNavHeader renders session title and id in chat tab label and omits plans tab', () => {
  const html = renderNavHeader(baseState);
  assert.match(html, /Plan Session Alpha/);
  assert.match(html, /sess-1/);
  assert.equal(html.includes('data-tab="plans"'), false);
  assert.equal(html.includes('Plans'), false);
});

test('renderChatView renders in-chat plan view with Back to Chat button when activePlan is set', () => {
  const planState: AppState = {
    ...baseState,
    activePlan: {
      name: 'sample_plan.md',
      title: 'Sample Plan',
      path: 'sample_plan.md',
      content: '# Sample Plan Content\n\n- [ ] Step 1',
      updatedAt: 6000,
      sizeBytes: 500,
    },
  };

  const html = renderChatView(planState);
  assert.match(html, /btn-back-to-chat/);
  assert.match(html, /Back to Chat/);
  assert.match(html, /Sample Plan/);
  assert.match(html, /Sample Plan Content/);
});

test('renderSidebarView limits sessions list to most recent when not searching and renders active session details', () => {
  const html = renderSidebarView(baseState);
  assert.match(html, /Plan Session Alpha/);
  assert.match(html, /Plan Session Beta/);
  assert.match(html, /Files Changed/);
  assert.match(html, /Artifacts/);
  assert.match(html, /sample_plan\.md/);
});
