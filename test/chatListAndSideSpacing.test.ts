import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderMarkdownDocument } from '../src/ui/components/markdown';

test('renderMarkdownDocument renders unordered and ordered lists with correct classes', () => {
  const md = [
    '### Environment Status',
    '- **Workspace:** `/Users/user/Work/code/agent`',
    '- **Branch:** `main`',
    '- **System Status:** Ready for instructions',
    '',
    '1. Step one',
    '2. Step two',
  ].join('\n');

  const html = renderMarkdownDocument(md);
  assert.match(html, /<ul class="md-ul">/);
  assert.match(html, /<li><strong>Workspace:<\/strong> <code class="inline-code[^"]*"[^>]*>\/Users\/user\/Work\/code\/agent<\/code><\/li>/);
  assert.match(html, /<ol class="md-ol">/);
  assert.match(html, /<li>Step one<\/li>/);
});

test('monitor.css defines explicit padding and list styles for md-ul and md-ol so bullets do not stick out', () => {
  const cssPath = path.join(process.cwd(), 'src/ui/monitor.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Must have .md-ul rule with padding-left >= 20px
  assert.match(css, /\.md-ul[^{]*\{[^}]*padding-left:\s*(?:2[0-9]|3[0-9]|4[0-9])px/);
  // Must have .md-ol rule with padding-left >= 20px
  assert.match(css, /\.md-ol[^{]*\{[^}]*padding-left:\s*(?:2[0-9]|3[0-9]|4[0-9])px/);
  // Must have list-style-type for md-ul and md-ol
  assert.match(css, /\.md-ul\s*\{[^}]*list-style-type:\s*disc/);
  assert.match(css, /\.md-ol\s*\{[^}]*list-style-type:\s*decimal/);
});

test('monitor.css provides generous side separation for chat messages on desktop and mobile', () => {
  const cssPath = path.join(process.cwd(), 'src/ui/monitor.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Base chat-scroll padding should have at least 18px horizontal padding
  assert.match(css, /\.chat-scroll\s*\{[^}]*padding:\s*\d+px\s+(?:1[8-9]|2[0-9]|3[0-9])px/);

  // Mobile responsive chat-scroll padding should have at least 14px horizontal padding
  assert.match(css, /@media\s*\(max-width:\s*640px\)[^{]*\{[\s\S]*?\.chat-scroll\s*\{[^}]*padding:\s*\d+px\s+(?:1[4-9]|2[0-9])px/);
});
