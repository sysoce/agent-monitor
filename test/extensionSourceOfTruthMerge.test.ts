import test from 'node:test';
import * as assert from 'node:assert/strict';
import { mergeSessionDetail } from '../src/ui/sessionMerge';
import type { SessionDetail } from '../src/server/types';

function createMockSession(id: string, messages: any[], isGenerating = false, updatedAt = 1000): SessionDetail {
  return { id, title: 'test', mode: 'agent', createdAt: 1000, updatedAt, isGenerating, messages, filesChanged: [], artifacts: [], subagents: [] };
}

test('mergeSessionDetail respects extension as source of truth for earlier completed turns', () => {
  const existing = createMockSession('sess-1', [
    { role: 'user', content: 'Reason and do a deep dive' },
    { role: 'assistant', content: 'Arch Deep Dive\n\n1. System Arch', isLive: false },
    { role: 'user', content: 'do you think?' },
  ]);
  const incoming = createMockSession('sess-1', [
    { role: 'user', content: 'Reason and do a deep dive' },
    { role: 'assistant', content: 'Arch Deep Dive\n\n1. System Arch\n\n2. Tools\n\n3. Models', isLive: false },
    { role: 'user', content: 'do you think?' },
    { role: 'assistant', content: 'Yes, full answer.', isLive: false },
  ], false, 5000);

  const merged = mergeSessionDetail(existing, incoming);
  assert.equal(merged.messages.length, 4);
  assert.equal(merged.messages[1]?.content, 'Arch Deep Dive\n\n1. System Arch\n\n2. Tools\n\n3. Models');
  assert.equal(merged.messages[3]?.content, 'Yes, full answer.');
});

test('mergeSessionDetail respects extension when user submitted message in extension while mobile was idle after a stop', () => {
  const mobileAfterStop = createMockSession('sess-1', [
    { role: 'user', content: 'Reason and do a deep dive' },
    { role: 'assistant', content: 'Arch Deep Dive\n\n1. System Arch', isLive: false },
  ], false, 2000);

  const incomingFromExtension = createMockSession('sess-1', [
    { role: 'user', content: 'Reason and do a deep dive' },
    { role: 'assistant', content: 'Arch Deep Dive\n\n1. System Arch\n\n2. Tools\n\n3. Models', isLive: false },
    { role: 'user', content: 'do you think?' },
    { role: 'assistant', content: 'Yes, draft', isLive: true },
  ], true, 5000);

  const merged = mergeSessionDetail(mobileAfterStop, incomingFromExtension);
  assert.equal(merged.messages.length, 4);
  assert.equal(merged.messages[1]?.content, 'Arch Deep Dive\n\n1. System Arch\n\n2. Tools\n\n3. Models');
  assert.equal(merged.messages[2]?.content, 'do you think?');
  assert.equal(merged.messages[3]?.content, 'Yes, draft');
});
