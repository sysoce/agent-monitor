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
  assert.ok(html.includes('Host Online') || html.includes('Git Backup'));
});

test('renderConnectionNotice shows queued when awaiting response and host has not synced', () => {
  const state = createBaseState();
  state.isAwaitingResponse = true;
  state.awaitingMessageTimestamp = Date.now();
  state.hostPresence = {
    clientId: 'desktop-host',
    clientName: 'Desktop Host',
    deviceType: 'desktop',
    lastActiveAt: Date.now() - 60000,
    lastSyncedAt: Date.now() - 60000, // Synced BEFORE message was sent
  };

  const html = renderConnectionNotice(state);
  assert.ok(html.includes('Prompt Queued in Git Sync'));
  assert.ok(html.includes('Waiting for host'));
});

test('renderConnectionNotice shows received when host synced after message timestamp', () => {
  const state = createBaseState();
  const now = Date.now();
  state.isAwaitingResponse = true;
  state.awaitingMessageTimestamp = now - 5000;
  state.hostPresence = {
    clientId: 'desktop-host',
    clientName: 'Desktop Host',
    deviceType: 'desktop',
    lastActiveAt: now - 1000,
    lastSyncedAt: now - 1000, // Synced AFTER message was sent
  };

  const html = renderConnectionNotice(state);
  assert.ok(html.includes('Received by Host') || html.includes('Synced with Host') || html.includes('Host is processing'));
});

test('renderConnectionNotice warns when host is asleep / inactive for over 3 minutes', () => {
  const state = createBaseState();
  const now = Date.now();
  state.isAwaitingResponse = true;
  state.awaitingMessageTimestamp = now;
  state.hostPresence = {
    clientId: 'desktop-host',
    clientName: 'Desktop Host',
    deviceType: 'desktop',
    lastActiveAt: now - 200000, // > 3 minutes ago
    lastSyncedAt: now - 200000,
  };

  const html = renderConnectionNotice(state);
  assert.ok(html.includes('asleep') || html.includes('inactive') || html.includes('different network'));
});
