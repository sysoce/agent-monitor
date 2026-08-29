import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderMarkdownDocument, formatInlineMarkdown } from '../src/ui/components/markdown';
import { formatThoughtDuration } from '../src/utils/thoughtCard';

test('formatThoughtDuration formats brief, seconds, minutes and compound durations with extension parity', () => {
  assert.equal(formatThoughtDuration(undefined), 'briefly');
  assert.equal(formatThoughtDuration(0.4), 'briefly');
  assert.equal(formatThoughtDuration(1), '1s');
  assert.equal(formatThoughtDuration(32), '32s');
  assert.equal(formatThoughtDuration(60), '1m');
  assert.equal(formatThoughtDuration(118), '1m 58s');
  assert.equal(formatThoughtDuration(120), '2m');
});

test('renderMarkdownDocument promotes lone bold section titles to md-bold-title', () => {
  const thought = [
    '**Analyzing Kernel Thoughts**',
    'I am currently focusing on understanding the context of "kernel" within our conversation.',
    '',
    '**Exploring Code Structure**',
    'My immediate focus is on examining the codebase at `/Users/user/Work/code/agent` to understand its kernel architecture.',
  ].join('\n');

  const html = renderMarkdownDocument(thought);

  assert.match(html, /<p class="[^"]*md-bold-title[^"]*"><strong>Analyzing Kernel Thoughts<\/strong><\/p>/);
  assert.match(html, /<p class="[^"]*md-bold-title[^"]*"><strong>Exploring Code Structure<\/strong><\/p>/);
  assert.match(html, /<code class="inline-code inline-code--link"[^>]*data-file-path="\/Users\/user\/Work\/code\/agent"[^>]*>\/Users\/user\/Work\/code\/agent<\/code>/);
});

test('renderMarkdownDocument detects file path candidates in inline code spans and decorates them as links', () => {
  const md = 'Check `src/kernel/index.ts`, `src/core/`, `/etc/hosts`, and normal command `list_dir`.';
  const html = renderMarkdownDocument(md);

  assert.match(html, /<code class="inline-code inline-code--link"[^>]*data-file-path="src\/kernel\/index\.ts"/);
  assert.match(html, /<code class="inline-code inline-code--link"[^>]*data-file-path="src\/core\/"/);
  assert.match(html, /<code class="inline-code inline-code--link"[^>]*data-file-path="\/etc\/hosts"/);
  assert.match(html, /<code class="inline-code">list_dir<\/code>/);
  assert.ok(!html.includes('data-file-path="list_dir"'));
});

test('renderMarkdownDocument renders tables, blockquotes, checklists, and code fences', () => {
  const doc = [
    '| Feature | Status |',
    '| :--- | :---: |',
    '| Kernel | Stable |',
    '',
    '> A note on architecture',
    '',
    '- [x] Done item',
    '- [ ] Pending item',
  ].join('\n');

  const html = renderMarkdownDocument(doc);
  assert.match(html, /<div class="md-table-wrap"><table class="md-table">/);
  assert.match(html, /<th[^>]*>Feature<\/th>/);
  assert.match(html, /<blockquote class="md-quote">/);
  assert.match(html, /<li class="checklist-item [^"]*done[^"]*">/);
  assert.match(html, /<span class="check-box [^"]*checked[^"]*">✓<\/span>/);
});
