import { test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { handleCopyAction, copyToClipboard } from '../src/ui/eventDelegation';
import { renderChatView } from '../src/ui/components/chatView';
import { renderMarkdownDocument } from '../src/ui/components/markdown';

let origDoc: any, origNav: any;
beforeEach(() => {
  origDoc = (globalThis as any).document;
  origNav = (globalThis as any).navigator;
});
afterEach(() => {
  (globalThis as any).document = origDoc;
  (globalThis as any).navigator = origNav;
});

function createMockEl(opts: { id?: string; className?: string; attrs?: Record<string, string>; parent?: any; text?: string }): any {
  const classes = new Set((opts.className || '').split(' ').filter(Boolean));
  const el: any = {
    id: opts.id || '',
    className: opts.className || '',
    parentElement: opts.parent || null,
    textContent: opts.text || '',
    classList: {
      contains: (c: string) => classes.has(c),
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      toggle: (c: string) => (classes.has(c) ? classes.delete(c) : classes.add(c), classes.has(c)),
    },
    getAttribute: (a: string) => opts.attrs?.[a] || null,
    setAttribute: (a: string, v: string) => { opts.attrs = opts.attrs || {}; opts.attrs[a] = v; },
    querySelector: (sel: string) => {
      if (sel.includes('code') && opts.className?.includes('code-block')) return createMockEl({ text: opts.text });
      if (sel.includes('msg-text') && opts.className?.includes('assistant')) return createMockEl({ text: opts.text });
      if (sel.includes('msg-user-text') && opts.className?.includes('user')) return createMockEl({ text: opts.text });
      return null;
    },
    closest: (sel: string) => {
      let cur: any = el;
      while (cur) {
        if (sel.split(',').some((s) => s.trim().startsWith('.') && cur.classList?.contains(s.trim().slice(1)))) return cur;
        if (sel.split(',').some((s) => s.trim().startsWith('#') && cur.id === s.trim().slice(1))) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
  };
  return el;
}

test('handleCopyAction uses navigator.clipboard when available', async () => {
  let copied = '';
  (globalThis as any).navigator = {
    clipboard: {
      writeText: async (t: string) => { copied = t; },
    },
  };

  const btn = createMockEl({ className: 'copy-btn', attrs: { 'data-copy-text': 'Hello world' } });
  const handled = handleCopyAction(btn);
  assert.equal(handled, true);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(copied, 'Hello world');
  assert.equal(btn.classList.contains('copied'), true);
});

test('handleCopyAction falls back to document.execCommand when navigator.clipboard is undefined (HTTP / non-secure contexts)', async () => {
  (globalThis as any).navigator = {}; // clipboard is undefined on HTTP
  let executedCmd = '';
  let textareaValue = '';
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'textarea') {
        const ta = {
          value: '',
          style: {},
          focus: () => {},
          select: () => { textareaValue = ta.value; },
        };
        return ta;
      }
      return {};
    },
    body: {
      appendChild: (el: any) => {},
      removeChild: (el: any) => {},
    },
    execCommand: (cmd: string) => {
      executedCmd = cmd;
      return true;
    },
  };

  const btn = createMockEl({ className: 'copy-btn', attrs: { 'data-copy-text': 'HTTP fallback text' } });
  const handled = handleCopyAction(btn);
  assert.equal(handled, true);
  assert.equal(executedCmd, 'copy');
  assert.equal(textareaValue, 'HTTP fallback text');
  assert.equal(btn.classList.contains('copied'), true);
});

test('renderChatView renders data-copy-text on both assistant and user copy buttons', () => {
  const state: any = {
    activeTab: 'chat',
    activeSessionId: 's1',
    activeSession: {
      id: 's1',
      messages: [
        { role: 'user', content: 'User question here' },
        { role: 'assistant', content: 'Assistant reply with **markdown**' },
      ],
    },
  };
  const html = renderChatView(state);
  assert.match(html, /data-copy-text="User question here"/);
  assert.match(html, /data-copy-text="Assistant reply with \*\*markdown\*\*"/);
});

test('renderMarkdownDocument renders data-copy-text on code copy buttons', () => {
  const md = '```ts\nconst x = 42;\n```';
  const html = renderMarkdownDocument(md);
  assert.match(html, /<button type="button" class="code-copy-btn copy-btn" data-copy-text="const x = 42;"/);
});
