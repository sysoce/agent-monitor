import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderDiffCard } from '../src/ui/components/diffCard';
import { renderToolCard } from '../src/ui/components/activityView';

test('renderDiffCard renders syntax-highlighted diff card for file modifications', () => {
  const html = renderDiffCard({
    filePath: 'src/extension/main.ts',
    startLine: 10,
    lines: [
      { type: 'deleted', lineNum: 10, content: 'const oldVal = 1;' },
      { type: 'added', lineNum: 10, content: 'const newVal = 2;' },
    ],
    deletions: 1,
    additions: 1,
  });

  assert.match(html, /diff-card/);
  assert.match(html, /diff-badge/);
  assert.match(html, /badge-ts/);
  assert.match(html, /TS/);
  assert.match(html, /main\.ts/);
  assert.match(html, /diff-stat--add/);
  assert.match(html, /\+1/);
  assert.match(html, /diff-stat--del/);
  assert.match(html, /-1/);
  assert.match(html, /diff-row--deleted/);
  assert.match(html, /diff-row--added/);
  assert.match(html, /tok-keyword/);
});

test('renderToolCard delegates replace_file_content to renderDiffCard', () => {
  const html = renderToolCard({
    id: 'call-1',
    name: 'replace_file_content',
    args: {
      TargetFile: 'src/utils/math.py',
      StartLine: 5,
      TargetContent: 'def add(a, b):\n    return a - b',
      ReplacementContent: 'def add(a, b):\n    return a + b',
    },
  });

  assert.match(html, /diff-card/);
  assert.match(html, /badge-py/);
  assert.match(html, /PY/);
  assert.match(html, /math\.py/);
  assert.match(html, /diff-row--deleted/);
  assert.match(html, /diff-row--added/);
});

test('renderToolCard renders normal activity toggle for non-edit tools', () => {
  const html = renderToolCard({
    id: 'call-2',
    name: 'read_file',
    args: { AbsolutePath: '/workspace/package.json' },
    result: { lines: 10 },
  });

  assert.match(html, /activity-toggle--tool/);
  assert.match(html, /Read package\.json/);
  assert.equal(html.includes('diff-card'), false);
});
