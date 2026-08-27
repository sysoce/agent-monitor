import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderChatView } from '../src/ui/components/chatView';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import { enrichPlanDetails } from '../src/server/sessionEnricher';
import type { AppState } from '../src/ui/types';

test('renderChatView renders all consecutive user messages from disk without dropping turns', () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [],
    activeSessionId: 'sess-test',
    plans: [],
    activeSession: {
      id: 'sess-test',
      title: 'Test Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [
        { role: 'user', content: 'test' },
        { role: 'user', content: 'test' },
        { role: 'user', content: 'test' },
        { role: 'user', content: 'test' },
        { role: 'assistant', content: 'Diagnostics completed.' },
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const html = renderChatView(state);
  const userTurns = html.match(/class="turn turn-user"/g) || [];
  assert.equal(userTurns.length, 4, 'Should render all 4 user turns in full sync with disk');
});

test('enrichPlanDetails does not attach planMeta to source code files like planView.ts', async () => {
  const messages: any[] = [
    {
      role: 'assistant',
      content: 'Workspace Status & Diagnostics:\n- Tracked Modifications: src/monitor/ui/components/planView.ts\nAll tests passing.',
    },
  ];

  await enrichPlanDetails('/non/existent', messages);
  assert.equal(messages[0].planMeta, undefined, 'planView.ts should not be treated as a plan');
});

test('SyncStateMachine updates status to connected on notModified responses', async () => {
  let latestStatus = 'syncing';
  const sm = new SyncStateMachine({
    onModeChange: () => {},
    onStatusChange: (s) => { latestStatus = s; },
    onDataUpdate: () => {},
  });

  sm.setGistConfig({ gistId: 'test-gist', token: 'test-token' });
  (sm as any).gistClient = {
    fetchSyncState: async () => ({ notModified: true, etag: 'etag-123' }),
  };
  (sm as any).mode = 'git-backup';

  await sm.pollOnce();
  assert.equal(latestStatus, 'connected');
});
