import test from 'node:test';
import * as assert from 'node:assert/strict';
import {
  escapeHtml,
  formatInlineMarkdown,
  renderMarkdownDocument,
} from '../src/ui/components/markdown';

test('escapeHtml escapes HTML entities correctly', () => {
  assert.equal(escapeHtml('<div>"Hello" & \'world\'</div>'), '&lt;div&gt;&quot;Hello&quot; &amp; \'world\'&lt;/div&gt;');
});

test('formatInlineMarkdown formats code, bold, italic and links', () => {
  const input = 'Use `const x = 1` and **bold** and *italic* and [link](https://example.com)';
  const formatted = formatInlineMarkdown(input);
  assert.match(formatted, /<code class="inline-code">const x = 1<\/code>/);
  assert.match(formatted, /<strong>bold<\/strong>/);
  assert.match(formatted, /<em>italic<\/em>/);
  assert.match(formatted, /<a href="https:\/\/example.com".*>link<\/a>/);
});

test('renderMarkdownDocument parses headings, lists, checklists and paragraphs', () => {
  const doc = [
    '# Title Header',
    '',
    '## Goal',
    'Complete the refactor by **eliminating over 12,000 lines** of legacy code (`src/extension/llm/`).',
    '',
    '---',
    '',
    '### Checklist',
    '- [ ] Task 1',
    '- [x] Task 2',
    '',
    '### Code',
    '```typescript',
    'const a = 10;',
    '```',
  ].join('\n');

  const html = renderMarkdownDocument(doc);
  assert.match(html, /<h1 class="[^"]*md-h1[^"]*">Title Header<\/h1>/);
  assert.match(html, /<h2 class="[^"]*md-h2[^"]*">Goal<\/h2>/);
  assert.match(html, /<p class="[^"]*md-p[^"]*">Complete the refactor by <strong>eliminating over 12,000 lines<\/strong> of legacy code \(<code class="inline-code[^"]*"[^>]*>src\/extension\/llm\/<\/code>\)\.<\/p>/);
  assert.match(html, /<hr class="md-hr" \/>/);
  assert.match(html, /<li class="checklist-item ">.*Task 1<\/li>/);
  assert.match(html, /<div class="code-block">/);
  assert.match(html, /<span class="code-lang">typescript<\/span>/);
  assert.match(html, /<button type="button" class="code-copy-btn copy-btn"/);
  assert.match(html, /<span class="tok-keyword">const<\/span>/);
});

test('formatInlineMarkdown does not convert source code links or names to plan buttons', () => {
  const input = 'Check [appController.ts](src/monitor/ui/appController.ts) and [sessionPlanSync.ts](src/monitor/ui/sessionPlanSync.ts)';
  const html = formatInlineMarkdown(input);
  assert.equal(html.includes('plan-view-btn'), false);
  assert.equal(html.includes('md-plan-link'), false);
  assert.match(html, /<a href="src\/monitor\/ui\/appController\.ts".*>appController\.ts<\/a>/);
});

