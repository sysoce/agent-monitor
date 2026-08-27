import test from 'node:test';
import * as assert from 'node:assert/strict';
import { mergeSessionDetail } from '../src/ui/sessionMerge';
import { applyGistSyncPayload } from '../src/ui/gistPayloadApplier';
import type { AppState } from '../src/ui/types';
import type { SessionDetail } from '../src/server/types';
import type { SyncGistPayload } from '../src/sync/types';

test('mergeSessionDetail preserves full completed message over stale partial live draft', () => {
  const existing: SessionDetail = {
    id: 'sess-test',
    title: 'test',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 3000,
    isGenerating: false,
    messages: [
      { role: 'user', content: 'test stop 3' },
      { role: 'assistant', content: 'Stop & Abort Verification Suite\n\nTest Suites Executed:\n- test1\n- test2', isLive: false },
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const staleIncoming: SessionDetail = {
    id: 'sess-test',
    title: 'test',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 2000,
    isGenerating: true,
    messages: [
      { role: 'user', content: 'test stop 3' },
      { role: 'assistant', content: 'Stop & Abort Verific', isLive: true },
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const merged = mergeSessionDetail(existing, staleIncoming);
  assert.equal(merged.messages.length, 2);
  assert.equal(merged.messages[1]?.content, 'Stop & Abort Verification Suite\n\nTest Suites Executed:\n- test1\n- test2');
  assert.equal(merged.isGenerating, false);
});

test('applyGistSyncPayload does not regress completed session to awaiting response on stale gist payload', () => {
  const state: Partial<AppState> = {
    activeSessionId: 'sess-test',
    isAwaitingResponse: false,
    awaitingSessionId: undefined,
    activeSession: {
      id: 'sess-test',
      title: 'test',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 3000,
      isGenerating: false,
      messages: [
        { role: 'user', content: 'test stop 3' },
        { role: 'assistant', content: 'Stop & Abort Verification Suite with all details', isLive: false },
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
  };

  const stalePayload: SyncGistPayload = {
    inbox: [],
    sessions: [{ id: 'sess-test', title: 'test', createdAt: 1000, updatedAt: 2000, messageCount: 2, preview: 'test' }],
    version: 1,
    updatedAt: 2000,
    activeSession: {
      sessionId: 'sess-test',
      updatedAt: 2000,
      plans: [],
      session: {
        id: 'sess-test',
        title: 'test',
        mode: 'agent',
        createdAt: 1000,
        updatedAt: 2000,
        isGenerating: true,
        messages: [
          { role: 'user', content: 'test stop 3' },
          { role: 'assistant', content: 'Stop & Abort Verific', isLive: true },
        ],
        filesChanged: [],
        artifacts: [],
        subagents: [],
      },
    },
  };

  applyGistSyncPayload(state as AppState, stalePayload);

  assert.equal(state.isAwaitingResponse, false, 'Should remain not awaiting response when current session is already completed');
  assert.equal(state.activeSession?.messages?.[1]?.content, 'Stop & Abort Verification Suite with all details');
});
