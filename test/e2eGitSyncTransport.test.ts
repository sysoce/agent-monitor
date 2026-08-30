import test from 'node:test';
import * as assert from 'node:assert/strict';
import { GistClient } from '../src/sync/gistClient';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import { submitUserMessage } from '../src/ui/messageSender';
import type { AppState } from '../src/ui/types';
import type { SyncGistPayload } from '../src/sync/types';

test('E2E Git-Sync: fetches manifest and dispatches inbox message', async () => {
  const config = { gistId: 'sync-repo-123', token: 'ghp_secretToken' };
  const gistClient = new GistClient(config, 'https://mock-api.github.com');

  let patchBody: any = null;
  const mockPayload: SyncGistPayload = {
    version: 1,
    updatedAt: Date.now(),
    inbox: [],
    sessions: [
      { id: 'sess-git-1', title: 'Git Sync Session', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 2, isGenerating: false },
    ],
    sessionDetails: {
      'sess-git-1': {
        id: 'sess-git-1',
        title: 'Git Sync Session',
        mode: 'agent',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [{ role: 'user', content: 'Initial message', timestamp: Date.now() }],
        filesChanged: [],
        artifacts: [],
        subagents: [],
        backgroundTasks: [],
        plans: [],
        isGenerating: false,
      },
    },
  };

  const customFetch = (async (url: string, opts?: RequestInit) => {
    if (opts?.method === 'PATCH') {
      patchBody = JSON.parse(opts.body as string);
      return new Response(JSON.stringify({ id: 'sync-repo-123', files: patchBody.files }), { status: 200 });
    }
    return new Response(JSON.stringify({
      id: 'sync-repo-123',
      files: { 'agent-sync.json': { content: JSON.stringify(mockPayload) } },
    }), {
      status: 200,
      headers: { etag: 'etag-git-1', 'x-ratelimit-remaining': '4999', 'x-ratelimit-limit': '5000', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600) },
    });
  }) as unknown as typeof fetch;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = customFetch;
  try {
    const res = await gistClient.fetchSyncState();
    assert.equal(res.data?.sessions.length, 1);
    assert.equal(res.data?.sessions[0].id, 'sess-git-1');

    const sm = new SyncStateMachine({
      onModeChange: () => {},
      onStatusChange: () => {},
      onDataUpdate: () => {},
    });
    sm.setGistConfig(config);
    sm.setMode('git-backup');

    const state: Partial<AppState> = {
      syncMode: 'git-backup',
      activeSessionId: 'sess-git-1',
      sessions: [{ id: 'sess-git-1', title: 'Git Sync Session', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 1 }],
      composerMode: 'agent',
    };

    await submitUserMessage(state as AppState, sm, 'Trigger git-sync iteration');

    assert.ok(patchBody);
    assert.ok(patchBody.files['agent-sync.json'].content);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
