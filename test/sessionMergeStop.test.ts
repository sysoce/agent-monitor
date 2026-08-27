import test from 'node:test';
import * as assert from 'node:assert/strict';
import { mergeSessionDetail } from '../src/ui/sessionMerge';
import type { SessionDetail } from '../src/server/types';

test('mergeSessionDetail overrides isGenerating to false when session was aborted and no newer user message exists', () => {
  const abortTime = 2000;
  const existing: SessionDetail = {
    id: 'sess-1',
    title: 'Session 1',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 1000,
    isGenerating: false,
    messages: [
      { role: 'user', content: 'Do something long', timestamp: 1500 } as any,
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
    updatedAt: 1800,
    isGenerating: true,
    messages: [
      { role: 'user', content: 'Do something long', timestamp: 1500 } as any,
      { role: 'assistant', content: 'Draft stream text...', isLive: true } as any,
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const merged = mergeSessionDetail(existing, incoming, undefined, abortTime);
  assert.equal(merged.isGenerating, false, 'isGenerating should be forced to false after abort');
  const lastMsg = merged.messages[merged.messages.length - 1] as any;
  if (lastMsg?.role === 'assistant') {
    assert.equal(lastMsg.isLive, false, 'Live draft state should be marked not live');
  }
});

test('mergeSessionDetail preserves isGenerating = true if a new user message was created AFTER lastAbortedAt', () => {
  const abortTime = 2000;
  const existing: SessionDetail = {
    id: 'sess-1',
    title: 'Session 1',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 3000,
    isGenerating: true,
    messages: [
      { role: 'user', content: 'First message', timestamp: 1500 } as any,
      { role: 'user', content: 'New message after stop', timestamp: 2500 } as any,
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
    updatedAt: 3000,
    isGenerating: true,
    messages: [
      { role: 'user', content: 'First message', timestamp: 1500 } as any,
      { role: 'user', content: 'New message after stop', timestamp: 2500 } as any,
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const merged = mergeSessionDetail(existing, incoming, undefined, abortTime);
  assert.equal(merged.isGenerating, true, 'isGenerating should remain true for new turn after abort');
});
