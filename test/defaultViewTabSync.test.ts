import test from 'node:test';
import * as assert from 'node:assert/strict';
import { syncSessionPlans, applyGistSyncPayload } from '../src/ui/sessionPlanSync';
import type { AppState } from '../src/ui/types';
import type { SessionDetail } from '../src/server/types';

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    sessions: [],
    plans: [],
    availableModels: [],
    activeTab: 'sidebar',
    syncStatus: 'connected',
    syncMode: 'live-sse',
    composerMode: 'agent',
    isAwaitingResponse: false,
    isSending: false,
    isAuthenticated: true,
    searchQuery: '',
    selectedModel: 'gpt-4o',
    attachments: [],
    ...overrides,
  };
}

test('syncSessionPlans does not automatically set activePlan or activePlanName on session load', async () => {
  const session: SessionDetail = {
    id: 'sess-100',
    title: 'Session With Plans',
    createdAt: 1000,
    updatedAt: 2000,
    mode: 'agent',
    messages: [{ role: 'user', content: 'hello' }],
    plans: [
      {
        name: 'task_plan.md',
        title: 'Task Plan',
        path: '/path/to/task_plan.md',
        updatedAt: 2000,
        sizeBytes: 100,
        content: '# Task Plan\n\n- [ ] Step 1',
      },
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const state = createMockState({
    activeSessionId: 'sess-100',
    activeSession: session,
    activeTab: 'chat',
  });

  await syncSessionPlans(state);

  assert.equal(state.plans.length, 1);
  assert.equal(state.activePlanName, undefined, 'activePlanName should remain undefined');
  assert.equal(state.activePlan, undefined, 'activePlan should remain undefined so chat view is shown');
});

test('applyGistSyncPayload defaults to sidebar tab if no sessions are available', () => {
  const state = createMockState({
    activeTab: 'sidebar',
    sessions: [],
    activeSessionId: undefined,
  });

  applyGistSyncPayload(state, {
    inbox: [],
    sessions: [],
    version: 1,
    updatedAt: 2000,
  });

  assert.equal(state.sessions.length, 0);
  assert.equal(state.activeSessionId, undefined);
  assert.equal(state.activeTab, 'sidebar');
});

test('applyGistSyncPayload selects chat tab when active session is present', () => {
  const session: SessionDetail = {
    id: 'sess-200',
    title: 'Active Session',
    createdAt: 1000,
    updatedAt: 2000,
    mode: 'agent',
    messages: [{ role: 'user', content: 'test' }],
    plans: [],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const state = createMockState({
    activeTab: 'sidebar',
  });

  applyGistSyncPayload(state, {
    inbox: [],
    sessions: [{ id: 'sess-200', title: 'Active Session', createdAt: 1000, updatedAt: 2000, messageCount: 1, preview: 'test' }],
    activeSession: { sessionId: 'sess-200', updatedAt: 2000, session },
    version: 1,
    updatedAt: 2000,
  });

  assert.equal(state.activeSessionId, 'sess-200');
  assert.equal(state.activeSession?.id, 'sess-200');
  assert.equal(state.activePlan, undefined);
});
