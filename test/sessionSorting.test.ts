import test from 'node:test';
import assert from 'node:assert/strict';
import { getSortedSessions } from '../src/ui/sidebarSessionUtils';
import type { AppState } from '../src/ui/types';
import type { SessionSummary } from '../src/server/types';
import { appendOptimisticUserMessage } from '../src/ui/sessionMerge';
import { applyGistSyncPayload } from '../src/ui/gistPayloadApplier';

test('getSortedSessions puts running sessions at top, followed by most recent updatedAt', () => {
  const sessions: SessionSummary[] = [
    { id: 's1', title: 'Session 1', createdAt: 1000, updatedAt: 1000, isGenerating: false, messageCount: 2 },
    { id: 's2', title: 'Session 2', createdAt: 1000, updatedAt: 3000, isGenerating: false, messageCount: 5 },
    { id: 's3', title: 'Session 3 (Running)', createdAt: 1000, updatedAt: 2000, isGenerating: true, messageCount: 1 },
    { id: 's4', title: 'Session 4', createdAt: 1000, updatedAt: 4000, isGenerating: false, messageCount: 3 },
  ];

  const state = {
    sessions,
    activeSessionId: 's4',
    syncMode: 'live-sse',
    syncStatus: 'connected',
    activeTab: 'chat',
    composerMode: 'agent',
    isMentionOpen: false,
    isModelPickerOpen: false,
    selectedModel: 'gemini-2.5-pro',
    availableModels: [],
    customConnections: [],
  } as unknown as AppState;

  const sorted = getSortedSessions(state);
  assert.equal(sorted[0]?.id, 's3', 'Running session s3 must be first');
  assert.equal(sorted[1]?.id, 's4', 'Most recent non-running session s4 (updatedAt 4000) must be second');
  assert.equal(sorted[2]?.id, 's2', 's2 (updatedAt 3000) must be third');
  assert.equal(sorted[3]?.id, 's1', 's1 (updatedAt 1000) must be fourth');
});

test('appendOptimisticUserMessage updates activeSession updatedAt and keeps interacted session most recent', () => {
  const now = 50000;
  const state = {
    sessions: [
      { id: 's1', title: 'Session 1', createdAt: 1000, updatedAt: 10000, messageCount: 1 },
      { id: 's2', title: 'Session 2', createdAt: 1000, updatedAt: 20000, messageCount: 1 },
    ],
    activeSessionId: 's1',
    activeSession: {
      id: 's1',
      title: 'Session 1',
      createdAt: 1000,
      updatedAt: 10000,
      mode: 'agent',
      messages: [],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
    syncMode: 'live-sse',
    syncStatus: 'connected',
    activeTab: 'chat',
    composerMode: 'agent',
    isMentionOpen: false,
    isModelPickerOpen: false,
    selectedModel: 'gemini-2.5-pro',
    availableModels: [],
    customConnections: [],
  } as unknown as AppState;

  appendOptimisticUserMessage(state, 'Hello from user');
  assert.ok(state.activeSession!.updatedAt >= now - 1000, 'activeSession updatedAt must be updated');
  const s1 = state.sessions.find((s) => s.id === 's1');
  assert.ok(s1 && s1.updatedAt >= now - 1000, 'state.sessions entry for s1 must have updated timestamp');
  
  const sorted = getSortedSessions(state);
  assert.equal(sorted[0]?.id, 's1', 'Interacted session s1 must now be at the top of the list');
});

test('applyGistSyncPayload maintains sorted order with running processes at top', () => {
  const state = {
    sessions: [],
    syncMode: 'git-backup',
    syncStatus: 'connected',
    activeTab: 'sidebar',
    composerMode: 'agent',
    isMentionOpen: false,
    isModelPickerOpen: false,
    selectedModel: 'gemini-2.5-pro',
    availableModels: [],
    customConnections: [],
  } as unknown as AppState;

  const payload = {
    timestamp: Date.now(),
    sessions: [
      { id: 's1', title: 'Session 1', updatedAt: 1000, messageCount: 2, isGenerating: false },
      { id: 's2', title: 'Session 2', updatedAt: 5000, messageCount: 4, isGenerating: false },
      { id: 's3', title: 'Session 3', updatedAt: 2000, messageCount: 1, isGenerating: true },
    ],
  };

  applyGistSyncPayload(state, payload as any);
  assert.equal(state.sessions[0]?.id, 's3', 'Running session s3 must be sorted to top on gist payload apply');
  assert.equal(state.sessions[1]?.id, 's2', 's2 must be second');
  assert.equal(state.sessions[2]?.id, 's1', 's1 must be third');
});
