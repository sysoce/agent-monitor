import test from 'node:test';
import * as assert from 'node:assert/strict';
import { submitMessageFlow, submitUserMessage } from '../src/ui/messageSender';
import { mergeSessionDetail } from '../src/ui/sessionMerge';
import { handleControlClick } from '../src/ui/controlHandlers';
import type { AppState } from '../src/ui/types';
import type { AttachmentItem } from '../src/types';
import type { SessionDetail } from '../src/server/types';

function createMockState(): AppState {
  return {
    activeTab: 'chat',
    syncMode: 'live-sse',
    activeSessionId: 'sess-1',
    activeSession: {
      id: 'sess-1',
      title: 'Session 1',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 1000,
      messages: [],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
    sessions: [{ id: 'sess-1', title: 'Session 1', preview: '', createdAt: 1000, updatedAt: 1000, messageCount: 0 }],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'test-model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    attachments: [
      { id: 'att-1', type: 'file', label: 'test.ts', path: 'src/test.ts' },
      { id: 'att-2', type: 'image', label: 'screenshot.png', content: 'data:image/png;base64,abc' },
    ],
  };
}

test('submitMessageFlow preserves and passes attachments to pushInboxMessage in git-backup mode', async () => {
  const state = createMockState();
  state.syncMode = 'git-backup';

  let pushedMessage: any = null;
  const mockSyncMachine: any = {
    setAwaitingResponse: () => {},
    pushInboxMessage: async (msg: any) => {
      pushedMessage = msg;
    },
  };

  await submitMessageFlow(state, mockSyncMachine, 'Check these attachments', async () => {}, () => {});

  assert.ok(pushedMessage, 'pushInboxMessage must be called');
  assert.equal(pushedMessage.content, 'Check these attachments');
  assert.ok(Array.isArray(pushedMessage.attachments), 'attachments array must be passed to pushInboxMessage');
  assert.equal(pushedMessage.attachments.length, 2);
  assert.equal(pushedMessage.attachments[0].label, 'test.ts');
  assert.equal(pushedMessage.attachments[1].label, 'screenshot.png');
  assert.equal(state.attachments?.length, 0, 'state.attachments should be cleared after message flow');
});

test('mergeSessionDetail preserves pending inbox and user message attachments', () => {
  const existing: SessionDetail = {
    id: 'sess-1',
    title: 'Session 1',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 1000,
    messages: [
      {
        role: 'user',
        content: 'Pending user turn',
        attachments: [{ id: 'att-1', type: 'file', label: 'test.ts' }],
        timestamp: Date.now(),
      } as any,
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const incoming: SessionDetail = {
    id: 'sess-1',
    title: 'Session 1',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 1000,
    messages: [],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const inbox = [
    {
      id: 'inbox-1',
      sessionId: 'sess-1',
      content: 'Pending inbox turn',
      attachments: [{ id: 'att-2', type: 'image', label: 'img.png' }],
      timestamp: Date.now(),
    },
  ];

  const merged = mergeSessionDetail(existing, incoming, inbox as any);
  assert.equal(merged.messages.length, 2);
  assert.equal(merged.messages[0]?.attachments?.[0]?.label, 'test.ts');
  assert.equal(merged.messages[1]?.attachments?.[0]?.label, 'img.png');
});

test('handleControlClick removes image attachments via .attachment-image-remove', () => {
  const state = createMockState();
  let rendered = false;
  const callbacks: any = { onRender: () => { rendered = true; } };

  const fakeElement = {
    closest: (sel: string) => {
      if (sel.includes('attachment-image-remove')) {
        return {
          getAttribute: (attr: string) => (attr === 'data-att-id' ? 'att-2' : null),
        };
      }
      return null;
    },
  } as any;

  const handled = handleControlClick(fakeElement, state, callbacks);
  assert.equal(handled, true);
  assert.equal(rendered, true);
  assert.equal(state.attachments?.length, 1);
  assert.equal(state.attachments?.[0]?.id, 'att-1');
});
