import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderThought, renderToolCard, renderPlanCard } from '../src/ui/components/activityView';
import { formatToolSummary } from '../src/ui/components/toolSummary';
import { renderChatView } from '../src/ui/components/chatView';
import type { AppState } from '../src/ui/types';

test('formatToolSummary formats various tool types accurately', () => {
  assert.equal(formatToolSummary('read_file', { path: 'plans/sample-plan.md' }), 'Read plans/sample-plan.md');
  assert.equal(formatToolSummary('list_dir', { path: 'test/stubs' }), 'Explored test/stubs');
  assert.equal(formatToolSummary('find', { pattern: '*.md' }), 'Explored *.md');
  assert.equal(formatToolSummary('write_file', { path: 'plans/sample-plan.md' }), 'Edited plans/sample-plan.md');
  assert.equal(formatToolSummary('create_plan', { title: 'Sample Plan' }), 'Created plan Sample Plan');
  assert.equal(formatToolSummary('todo_write', {}), 'Updated todos');
  assert.equal(formatToolSummary('grep', { query: 'dist-test' }), 'Searched dist-test');
  assert.equal(formatToolSummary('bash', { command: 'npm run test:build' }), 'Ran npm run test:build');
});

test('renderThought produces extension-parity activity toggle HTML', () => {
  const html = renderThought('Let me think about how to solve this.');
  assert.match(html, /activity-toggle activity-toggle--thought/);
  assert.match(html, /activity-toggle-header/);
  assert.match(html, /<span class="activity-toggle-title">Thought<\/span>/);
  assert.match(html, /<span class="activity-toggle-duration">briefly<\/span>/);
  assert.match(html, /<span class="activity-toggle-chevron">›<\/span>/);
  assert.match(html, /activity-toggle-body/);
  assert.match(html, /activity-toggle-thought-text/);
  assert.match(html, /Let me think about how to solve this/);
});

test('renderToolCard produces extension-parity tool activity toggle with chevron and output', () => {
  const html = renderToolCard({
    id: 'call-1',
    name: 'read_file',
    args: { path: 'plans/sample-plan.md' },
    result: '# Sample Plan\nContent here',
  });
  assert.match(html, /activity-toggle activity-toggle--tool/);
  assert.match(html, /Read plans\/sample-plan\.md/);
  assert.match(html, /activity-toggle-chevron/);
  assert.match(html, /activity-toggle-output/);
  assert.match(html, /# Sample Plan/);
});

test('renderPlanCard renders CREATED PLAN badge and action buttons', () => {
  const html = renderPlanCard({
    title: 'Sample Plan',
    overview: 'Self-contained sample plan',
    path: 'plans/sample-plan.md',
  });
  assert.match(html, /plan-card/);
  assert.match(html, /CREATED PLAN/i);
  assert.match(html, /Sample Plan/);
  assert.match(html, /Self-contained sample plan/);
  assert.match(html, /plan-view-btn/);
  assert.match(html, /plan-build-btn/);
  assert.match(html, /⚡ Build with Agent/);
});

test('renderChatView suppresses raw tool messages and attaches results to tool toggles', () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [],
    activeSessionId: 'sess-1',
    activeSession: {
      id: 'sess-1',
      title: 'Sample Plan Test',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [
        { role: 'user', content: 'Create a sample plan' },
        {
          role: 'assistant',
          content: 'Let me look at an existing plan file.',
          thought: 'Looking at files',
          tool_calls: [{ id: 'call-1', name: 'read_file', args: { path: 'plans/sample-plan.md' } }],
        } as any,
        {
          role: 'tool',
          tool_call_id: 'call-1',
          name: 'read_file',
          content: '{"exitCode":0,"stdout":"success"}',
        } as any,
        {
          role: 'assistant',
          content: 'I created the plan.',
        },
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'gpt-4o',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const html = renderChatView(state);
  // Raw tool message JSON must not appear as an assistant message bubble
  assert.doesNotMatch(html, /<div class="msg-bubble msg-assistant"><div class="msg-text">\{"exitCode":0/);
  // Tool call toggle must be rendered with proper summary
  assert.match(html, /Read plans\/sample-plan\.md/);
  assert.match(html, /Thought/);
  assert.match(html, /Let me look at an existing plan file/);
  assert.match(html, /I created the plan/);
});
