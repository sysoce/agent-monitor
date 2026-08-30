import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderAssistantTurn } from '../src/ui/components/chatTurnRenderer';
import type { ChatMessage } from '../src/types';

test('renderAssistantTurn renders error card when text contains ⚠️ **Model Error:**', () => {
  const msg: ChatMessage = {
    role: 'assistant',
    content: "Yes, I'm here! (Received at 17:33 local time).\n\n⚠️ **Model Error:**\n\nAntigravity Error: The stream was interrupted. Please continue the task you were working on.",
  };

  const html = renderAssistantTurn(msg);

  // Markdown assistant bubble for the preceding text
  assert.match(html, /class="msg assistant"/);
  assert.match(html, /Yes, I'm here! \(Received at 17:33 local time\)\./);

  // Error card with warning header
  assert.match(html, /class="msg-error-card"/);
  assert.match(html, /class="msg-error-header"/);
  assert.match(html, /class="msg-error-icon">⚠️<\/span>/);
  assert.match(html, /class="msg-error-title">Model Request Failed<\/span>/);

  // Error body with cleaned text
  assert.match(html, /class="msg-error-body">Antigravity Error: The stream was interrupted\. Please continue the task you were working on\.<\/div>/);
  assert.doesNotMatch(html, /⚠️ \*\*Model Error:\*\*/);

  // Action buttons
  assert.match(html, /class="msg-error-actions"/);
  assert.match(html, /id="btn-error-settings"/);
  assert.match(html, /⚙️ Configure Settings/);
  assert.match(html, /id="btn-error-retry"/);
  assert.match(html, /🔄 Retry/);
});

test('renderAssistantTurn renders error card when msg has isError: true and explicit error property', () => {
  const msg: any = {
    role: 'assistant',
    content: 'Working on your request...',
    error: 'Antigravity Error: The stream was interrupted.',
    isError: true,
  };

  const html = renderAssistantTurn(msg);

  assert.match(html, /Working on your request\.\.\./);
  assert.match(html, /class="msg-error-card"/);
  assert.match(html, /Antigravity Error: The stream was interrupted\./);
  assert.match(html, /id="btn-error-retry"/);
});

test('renderAssistantTurn renders solely error card without empty bubble when content is empty and isError: true', () => {
  const msg: any = {
    role: 'assistant',
    content: '',
    error: 'Rate limit exceeded. Please wait a moment.',
    isError: true,
  };

  const html = renderAssistantTurn(msg);

  assert.doesNotMatch(html, /class="msg assistant"/);
  assert.match(html, /class="msg-error-card"/);
  assert.match(html, /Rate limit exceeded\. Please wait a moment\./);
  assert.match(html, /id="btn-error-settings"/);
  assert.match(html, /id="btn-error-retry"/);
});
