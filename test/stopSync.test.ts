import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { reloadSessionData } from '../src/ui/sessionDataLoader';
import { isAgentRunning, isComposerStopMode } from '../src/ui/composerButton';
import type { AppState } from '../src/ui/types';

test('reloadSessionData resets isGenerating and isAwaitingResponse when server reports session stopped by another client', async () => {
  const state: AppState = {
    activeTab: 'chat',
    activeSessionId: 'sess-target',
    activeSession: {
      id: 'sess-target',
      title: 'Target Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      isGenerating: true,
      messages: [
        { role: 'user', content: 'hello', timestamp: 1000 } as any,
        { role: 'assistant', content: 'working...', isLive: true } as any,
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      plans: [],
    },
    sessions: [
      { id: 'sess-target', title: 'Target Session', isGenerating: true, createdAt: 1000, updatedAt: 2000, messageCount: 2 } as any,
    ],
    plans: [],
    syncStatus: 'connected',
    syncMode: 'live-sse',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model-1',
    availableModels: [],
    isSending: false,
    isAwaitingResponse: true,
    isAuthenticated: true,
    attachments: [],
  };

  assert.equal(isAgentRunning(state), true);
  assert.equal(isComposerStopMode(state), true);

  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    const urlStr = String(url);
    if (urlStr.includes('/api/models')) {
      return new Response(JSON.stringify({ models: [], groups: [] }), { status: 200 });
    }
    if (urlStr.includes('/api/sessions/sess-target')) {
      return new Response(JSON.stringify({
        session: {
          id: 'sess-target',
          title: 'Target Session',
          mode: 'agent',
          createdAt: 1000,
          updatedAt: 3000,
          isGenerating: false,
          messages: [
            { role: 'user', content: 'hello', timestamp: 1000 },
            { role: 'assistant', content: 'working... (stopped)', isLive: false },
          ],
          filesChanged: [],
          artifacts: [],
          subagents: [],
          plans: [],
        }
      }), { status: 200 });
    }
    if (urlStr.includes('/api/sessions')) {
      return new Response(JSON.stringify({
        sessions: [
          { id: 'sess-target', title: 'Target Session', isGenerating: false, createdAt: 1000, updatedAt: 3000, messageCount: 2 },
        ]
      }), { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  }) as any;

  try {
    let doneCalled = false;
    await reloadSessionData(state, false, () => { doneCalled = true; });

    assert.equal(doneCalled, true);
    assert.equal(state.sessions[0]?.isGenerating, false, 'Matching session in sessions list must be isGenerating=false');
    assert.equal(state.activeSession?.isGenerating, false, 'activeSession must be isGenerating=false');
    assert.equal(state.isAwaitingResponse, false, 'isAwaitingResponse must be cleared');
    assert.equal(isAgentRunning(state), false, 'isAgentRunning must now return false');
    assert.equal(isComposerStopMode(state), false, 'isComposerStopMode must now return false (Send button mode)');
  } finally {
    globalThis.fetch = origFetch;
  }
});
