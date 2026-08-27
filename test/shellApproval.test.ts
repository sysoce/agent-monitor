import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderShellApprovalCard } from '../src/ui/components/shellApprovalCard';

test('renderShellApprovalCard renders command, prompt icon, and Allow/Reject buttons when pending', () => {
  const html = renderShellApprovalCard({
    commandId: 'cmd-123',
    command: 'npm run build',
  });

  assert.ok(html.includes('activity-toggle--shell'), 'Includes shell toggle class');
  assert.ok(html.includes('shell-approval-card'), 'Includes shell approval card class');
  assert.ok(html.includes('cmd-123'), 'Contains commandId');
  assert.ok(html.includes('npm run build'), 'Contains command string');
  assert.ok(html.includes('shell-btn--allow'), 'Contains Allow button');
  assert.ok(html.includes('shell-btn--reject'), 'Contains Reject button');
  assert.ok(html.includes('data-command-id="cmd-123"'), 'Has data-command-id attribute');
  assert.ok(html.includes('data-decision="allow"'), 'Has allow decision attribute');
  assert.ok(html.includes('data-decision="reject"'), 'Has reject decision attribute');
});

test('renderShellApprovalCard renders decision badge when decision is already made', () => {
  const allowedHtml = renderShellApprovalCard({
    commandId: 'cmd-456',
    command: 'git status',
    allowed: true,
  });
  assert.ok(allowedHtml.includes('is-allowed'), 'Contains is-allowed class');
  assert.ok(allowedHtml.includes('Allowed'), 'Contains Allowed text');
  assert.ok(!allowedHtml.includes('shell-btn--allow'), 'Does not render allow button when decided');

  const rejectedHtml = renderShellApprovalCard({
    commandId: 'cmd-789',
    command: 'rm -rf dist',
    allowed: false,
  });
  assert.ok(rejectedHtml.includes('is-rejected'), 'Contains is-rejected class');
  assert.ok(rejectedHtml.includes('Rejected'), 'Contains Rejected text');
});
