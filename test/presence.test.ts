import test from 'node:test';
import * as assert from 'node:assert/strict';
import type { AppState } from '../src/ui/types';
import { renderConnectionNotice } from '../src/ui/components/connectionNotice';
import { renderNavHeader } from '../src/ui/components/navHeader';

function createBaseState(): AppState {
  return {
    activeTab: 'chat',
    sessions: [{ id: 's1', title: 'Session 1', preview: '', createdAt: 1, updatedAt: 1, messageCount: 1 }],
    activeSessionId: 's1',
    plans: [],
    syncStatus: 'connected',
    syncMode: 'git-backup',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'gpt-4o',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };
}

test('renderNavHeader shows host presence when in git-backup mode', () => {
  const state = createBaseState();
  state.hostPresence = {
    clientId: 'desktop-host',
    clientName: 'Desktop Host',
    deviceType: 'desktop',
    lastActiveAt: Date.now() - 5000,
    lastSyncedAt: Date.now() - 5000,
  };

  const html = renderNavHeader(state);
  assert.ok(html.includes('status-git-backup'));
  assert.ok(html.includes('Online') || html.includes('P2P') || html.includes('Git Backup'));
});

test('renderConnectionNotice stays clean without banner when awaiting response', () => {
  const state = createBaseState();
  state.isAwaitingResponse = true;
  state.awaitingMessageTimestamp = Date.now();
  state.hostPresence = {
    clientId: 'desktop-host',
    clientName: 'Desktop Host',
    deviceType: 'desktop',
    lastActiveAt: Date.now() - 60000,
    lastSyncedAt: Date.now() - 60000,
  };

  const html = renderConnectionNotice(state);
  assert.equal(html, '');
});
