import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { formatMessageTime, renderMessageCopyActionsHtml } from '../src/ui/copyActions';
import { renderChatView } from '../src/ui/components/chatView';

test('formatMessageTime returns empty string for undefined or invalid timestamps', () => {
  assert.equal(formatMessageTime(undefined), '');
  assert.equal(formatMessageTime(null as any), '');
  assert.equal(formatMessageTime(NaN), '');
  assert.equal(formatMessageTime(''), '');
});

test('formatMessageTime preserves pre-formatted time strings', () => {
  assert.equal(formatMessageTime('12:34 PM'), '12:34 PM');
  assert.equal(formatMessageTime('00:39'), '00:39');
});

test('formatMessageTime formats numeric timestamps and ISO strings', () => {
  const ts = new Date('2026-08-27T14:30:00Z').getTime();
  const formatted = formatMessageTime(ts);
  assert.ok(formatted.length > 0);
  assert.match(formatted, /\d{1,2}:\d{2}/);

  const fromIso = formatMessageTime('2026-08-27T14:30:00Z');
  assert.ok(fromIso.length > 0);
  assert.match(fromIso, /\d{1,2}:\d{2}/);
});

test('renderMessageCopyActionsHtml includes msg-time element when timestamp or time is provided', () => {
  const htmlWithTime = renderMessageCopyActionsHtml({
    user: true,
    copyText: 'Hello',
    time: '12:34 PM',
  });
  assert.match(htmlWithTime, /class="msg-time"/);
  assert.match(htmlWithTime, />12:34 PM<\/span>/);
  assert.match(htmlWithTime, /copy-btn/);

  const htmlWithoutTime = renderMessageCopyActionsHtml({
    user: false,
    copyText: 'Answer',
  });
  assert.doesNotMatch(htmlWithoutTime, /class="msg-time"/);
});

test('renderChatView renders formatted message time next to copy buttons for user and assistant messages', () => {
  const testTimestamp = new Date('2026-08-27T10:15:00Z').getTime();
  const state: any = {
    activeTab: 'chat',
    activeSessionId: 's1',
    activeSession: {
      id: 's1',
      messages: [
        { role: 'user', content: 'User prompt', timestamp: testTimestamp },
        { role: 'assistant', content: 'Assistant response', timestamp: testTimestamp },
      ],
    },
  };
  const html = renderChatView(state);
  assert.match(html, /<div class="msg-copy-actions msg-copy-actions--user"><span class="msg-time">/);
  assert.match(html, /<div class="msg-copy-actions"><button[^>]+class="copy-btn copy-btn--compact"[^>]*>.*?<\/button><span class="msg-time">/s);
});
