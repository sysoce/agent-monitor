import test from 'node:test';
import * as assert from 'node:assert/strict';
import { groupMessagesIntoTurns } from '../src/ui/components/turnGrouper';
import type { ChatMessage } from '../src/types';

test('groupMessagesIntoTurns filters out non-last empty assistant messages even when isGenerating is true', () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'First question' },
    { role: 'assistant', content: '' },
    { role: 'user', content: 'Second question' },
  ];

  const turns = groupMessagesIntoTurns(messages, new Map(), true);
  assert.equal(turns.length, 2, 'Should not keep empty assistant message when followed by user message');
  assert.equal(turns[0]?.role, 'user');
  assert.equal(turns[1]?.role, 'user');
});

test('groupMessagesIntoTurns marks only the last assistant turn as live when isGenerating is true', () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'First question' },
    { role: 'assistant', content: 'First answer', thought: 'First thought' } as any,
    { role: 'user', content: 'Second question' },
    { role: 'assistant', content: 'Second answer', thought: 'Second thought' } as any,
  ];

  const turns = groupMessagesIntoTurns(messages, new Map(), true);
  assert.equal(turns.length, 4);
  const firstAssistant = turns[1] as any;
  const secondAssistant = turns[3] as any;

  assert.equal(firstAssistant.role, 'assistant');
  assert.equal(Boolean(firstAssistant.isLive), false, 'First assistant turn must not be marked live');

  assert.equal(secondAssistant.role, 'assistant');
  assert.equal(Boolean(secondAssistant.isLive), true, 'Last assistant turn must be marked live when isGenerating is true');
});

test('groupMessagesIntoTurns keeps the last empty assistant message when isGenerating is true and marks it live', () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'First question' },
    { role: 'assistant', content: '', isLive: true } as any,
  ];

  const turns = groupMessagesIntoTurns(messages, new Map(), true);
  assert.equal(turns.length, 2);
  const liveAssistant = turns[1] as any;
  assert.equal(liveAssistant.role, 'assistant');
  assert.equal(liveAssistant.isLive, true);
});
