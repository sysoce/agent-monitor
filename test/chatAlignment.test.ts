import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderMarkdownDocument } from '../src/ui/components/markdown';
import { renderChatView } from '../src/ui/components/chatView';


test('monitor.css and imported panel.css include borderless tool calls, prompt icons, and syntax highlight tokens', () => {
  const cssPath = path.join(process.cwd(), 'src/ui/monitor.css');
  const panelCssPath = path.join(process.cwd(), 'src/ui/css/panel.css');
  const css = fs.readFileSync(cssPath, 'utf8') + '\n' + fs.readFileSync(panelCssPath, 'utf8');

  // Verify tool-prompt-icon exists
  assert.match(css, /\.tool-prompt-icon\s*\{[^}]*color:\s*#58a6ff/);

  // Verify syntax highlight tokens exist
  assert.match(css, /\.tok-keyword/);
  assert.match(css, /\.tok-function/);
  assert.match(css, /\.tok-string/);
  assert.match(css, /\.tok-comment/);
  assert.match(css, /\.tok-number/);
  assert.match(css, /\.tok-type/);

  // Verify markdown element classes exist
  assert.match(css, /\.inline-code/);
  assert.match(css, /\.md-p/);
  assert.match(css, /\.code-block/);
});


test('renderMarkdownDocument outputs syntax highlight spans for code blocks', () => {
  const md = '```ts\nconst x: number = 42;\nfunction run() {}\n```';
  const html = renderMarkdownDocument(md);
  assert.match(html, /<span class="tok-keyword">const<\/span>/);
  assert.match(html, /<span class="tok-type">number<\/span>/);
  assert.match(html, /<span class="tok-function">run<\/span>/);
});

test('renderChatView renders copy action buttons on both user and assistant turns', () => {
  const state: any = {
    activeTab: 'chat',
    activeSessionId: 'sess-1',
    activeSession: {
      id: 'sess-1',
      messages: [
        { role: 'user', content: 'Hello agent' },
        { role: 'assistant', content: 'Hello user, I can help.' },
      ],
    },
  };
  const html = renderChatView(state);
  // User turn copy action
  assert.match(html, /class="msg-copy-actions\s+msg-copy-actions--user"/);
  assert.match(html, /class="copy-btn copy-btn--compact"[^>]*title="Copy Message"/);
  // Assistant turn copy action
  assert.match(html, /class="msg-copy-actions"/);
  assert.match(html, /class="copy-btn copy-btn--compact"[^>]*title="Copy Answer"/);
  // Copy icon SVG
  assert.match(html, /copy-btn-icon--copy/);
});

test('renderChatView renders walkthrough cards when walkthroughMeta is present', () => {
  const state: any = {
    activeTab: 'chat',
    activeSessionId: 'sess-1',
    activeSession: {
      id: 'sess-1',
      messages: [
        {
          role: 'assistant',
          content: 'Here is the walkthrough.',
          walkthroughMeta: {
            title: 'Walkthrough: Feature X',
            path: '.agent/walkthroughs/feature-x.md',
            summary: 'Added feature X with tests.',
          },
        },
      ],
    },
  };
  const html = renderChatView(state);
  assert.match(html, /class="walkthrough-card"/);
  assert.match(html, /Walkthrough: Feature X/);
  assert.match(html, /Added feature X with tests/);
  assert.match(html, /class="walkthrough-view-btn"/);
});

test('monitor.css activity-toggle does not contain bulky background or full-width flex justify overrides', () => {
  const cssPath = path.join(process.cwd(), 'src/ui/monitor.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Must not override .activity-toggle with #202020 box background
  assert.doesNotMatch(css, /\.activity-toggle\s*\{[^}]*background:\s*#202020/);
  // Must not override .activity-toggle-header with space-between
  assert.doesNotMatch(css, /\.activity-toggle-header\s*\{[^}]*justify-content:\s*space-between/);
});

