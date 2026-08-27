import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderMentionDropdown } from '../src/ui/components/mentionDropdown';

test('renderMentionDropdown renders slim items correctly without action bar', () => {
  const items = [
    { type: 'file' as const, label: 'docs/agent_plan.md', detail: '' },
    { type: 'folder' as const, label: 'src/monitor/', detail: '' },
  ];

  const html = renderMentionDropdown(items, 0);
  assert.equal(html.includes('mention-action-bar'), false);
  assert.equal(html.includes('btn-action-photo'), false);
  assert.equal(html.includes('btn-action-file'), false);
  assert.match(html, /docs\/agent_plan\.md/);
  assert.match(html, /src\/monitor\//);
  assert.match(html, /mention-item active/);
});

test('renderMentionDropdown renders empty state when no matches', () => {
  const html = renderMentionDropdown([], 0);
  assert.match(html, /No matching files/);
});
