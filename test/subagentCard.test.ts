import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderSubagentCard } from '../src/ui/components/subagentCard';

test('renderSubagentCard renders role, prompt summary, and running spinner when active', () => {
  const html = renderSubagentCard({
    id: 'sub-1',
    role: 'Codebase Researcher',
    prompt: 'Survey authentication implementations across the codebase',
    status: 'running',
  });

  assert.ok(html.includes('subagent-card'), 'Contains subagent-card class');
  assert.ok(html.includes('Codebase Researcher'), 'Contains subagent role');
  assert.ok(html.includes('Survey authentication'), 'Contains prompt preview');
  assert.ok(html.includes('subagent-spinner') || html.includes('task-spinner-icon'), 'Contains running spinner');
  assert.ok(html.includes('activity-toggle-chevron'), 'Contains toggle chevron');
});

test('renderSubagentCard renders completed state and result when provided', () => {
  const html = renderSubagentCard({
    id: 'sub-2',
    role: 'Test Runner',
    prompt: 'Run unit tests',
    status: 'completed',
    result: 'All 729 tests passed cleanly',
  });

  assert.ok(html.includes('subagent-card'), 'Contains subagent-card class');
  assert.ok(html.includes('Test Runner'), 'Contains subagent role');
  assert.ok(html.includes('All 729 tests passed cleanly'), 'Contains subagent result');
  assert.ok(html.includes('task-icon--completed') || html.includes('subagent-completed'), 'Contains completed indicator');
});
