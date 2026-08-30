import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { parseInline } from '../src/ui/markdown/inline';
import { formatInlineMarkdown } from '../src/ui/components/markdown';
import { resolvePlanPath } from '../src/server/planStore';
import { handleFileClick, extractCleanFilePath } from '../src/ui/fileClickHandler';
import type { AppState } from '../src/ui/types';

test('parseInline parses autolink inside parentheses without capturing trailing paren', () => {
  const input = 'Check the output at (file:///Users/user/.gemini/antigravity-cli/scratch)';
  const nodes = parseInline(input);

  const linkNode = nodes.find((n) => n.type === 'link') as { type: 'link'; href: string; children: any[] } | undefined;
  assert.ok(linkNode, 'Should produce a link node');
  assert.equal(linkNode.href, 'file:///Users/user/.gemini/antigravity-cli/scratch');

  const textNodes = nodes.filter((n) => n.type === 'text') as Array<{ type: 'text'; value: string }>;
  const lastText = textNodes[textNodes.length - 1]?.value;
  assert.equal(lastText, ')');
});

test('formatInlineMarkdown renders clean file links without trailing punctuation in href', () => {
  const input = 'Output at (file:///Users/user/.gemini/antigravity-cli/scratch).';
  const html = formatInlineMarkdown(input);

  assert.match(html, /<a href="file:\/\/\/Users\/user\/\.gemini\/antigravity-cli\/scratch"/);
  assert.match(html, /\)\.<\/a>|\)<\/a>\.|\)\./);
});

test('extractCleanFilePath cleans file:// URIs and whitespace', () => {
  assert.equal(extractCleanFilePath('file:///Users/user/project/file.ts'), '/Users/user/project/file.ts');
  assert.equal(extractCleanFilePath('file:///Users/user/.gemini/antigravity-cli/scratch'), '/Users/user/.gemini/antigravity-cli/scratch');
  assert.equal(extractCleanFilePath('  /Users/user/code/index.ts  '), '/Users/user/code/index.ts');
  assert.equal(extractCleanFilePath('file:///path/to/file.ts#L10-L20'), '/path/to/file.ts');
});

test('resolvePlanPath resolves plans from antigravity-cli brain and scratch directories', async () => {
  const home = os.homedir();
  const cliBrainDir = path.join(home, '.gemini', 'antigravity-cli', 'brain');
  const testPlanPath = path.join(cliBrainDir, 'test_auto_cli_plan.plan.md');

  try {
    await fs.mkdir(cliBrainDir, { recursive: true });
    await fs.writeFile(testPlanPath, '# Test Auto CLI Plan\n\nPlan details', 'utf8');

    const resolved = await resolvePlanPath(os.tmpdir(), 'test_auto_cli_plan.plan.md');
    assert.equal(resolved, testPlanPath);
  } finally {
    try { await fs.rm(testPlanPath, { force: true }); } catch {}
  }
});

test('handleFileClick intercepts file:// links and copies path to clipboard', async () => {
  let copiedText = '';
  const dummyState: AppState = {
    selectedModel: 'test-model',
    activeTab: 'chat',
  } as unknown as AppState;

  let selectedPlan = '';
  const dummyCallbacks = {
    onSelectPlan: (name: string) => { selectedPlan = name; },
    onRender: () => {},
  } as any;

  // 1. Plain file link (not a plan)
  const linkEl = {
    closest: (selector: string) => {
      if (selector.includes('.md-link') || selector.includes('[data-file-path]')) {
        return {
          getAttribute: (attr: string) => (attr === 'href' ? 'file:///Users/user/.gemini/antigravity-cli/scratch' : null),
          tagName: 'A',
          classList: { add: () => {}, remove: () => {} },
          querySelector: () => null,
        };
      }
      return null;
    },
  } as unknown as HTMLElement;

  const handled = await handleFileClick(linkEl, dummyState, dummyCallbacks, async (text) => {
    copiedText = text;
    return true;
  });

  assert.equal(handled, true);
  assert.equal(copiedText, '/Users/user/.gemini/antigravity-cli/scratch');
  assert.equal(selectedPlan, '');

  // 2. Plan file link
  const planEl = {
    closest: (selector: string) => {
      if (selector.includes('.md-link') || selector.includes('[data-file-path]')) {
        return {
          getAttribute: (attr: string) => (attr === 'href' ? 'file:///Users/user/plans/feature.plan.md' : null),
          tagName: 'A',
        };
      }
      return null;
    },
  } as unknown as HTMLElement;

  const planHandled = await handleFileClick(planEl, dummyState, dummyCallbacks);
  assert.equal(planHandled, true);
  assert.equal(selectedPlan, 'feature.plan.md');
});
