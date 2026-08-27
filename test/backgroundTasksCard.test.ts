import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderBackgroundTasksCard } from '../src/ui/components/backgroundTasksCard';

test('renderBackgroundTasksCard returns empty string when no tasks provided', () => {
  assert.equal(renderBackgroundTasksCard([]), '');
  assert.equal(renderBackgroundTasksCard(undefined), '');
});

test('renderBackgroundTasksCard renders task count, items, and status icons', () => {
  const html = renderBackgroundTasksCard([
    { id: 't1', name: 'npm run watch', status: 'running' },
    { id: 't2', name: 'compile tests', status: 'completed' },
    { id: 't3', name: 'linter', status: 'failed' },
  ], { collapsed: false });

  assert.ok(html.includes('background-tasks-card'), 'Contains background-tasks-card class');
  assert.ok(html.includes('tasks-badge'), 'Contains tasks badge');
  assert.ok(html.includes('1'), 'Badge shows running count (1)');
  assert.ok(html.includes('npm run watch'), 'Contains first task name');
  assert.ok(html.includes('compile tests'), 'Contains second task name');
  assert.ok(html.includes('task-icon--running'), 'Contains running icon class');
  assert.ok(html.includes('task-icon--completed'), 'Contains completed icon class');
  assert.ok(html.includes('task-icon--failed'), 'Contains failed icon class');
  assert.ok(html.includes('tasks-stop-btn'), 'Contains Stop Tasks button');
});

test('renderBackgroundTasksCard respects collapsed option', () => {
  const collapsedHtml = renderBackgroundTasksCard([
    { id: 't1', name: 'long job', status: 'running' },
  ], { collapsed: true });

  assert.ok(collapsedHtml.includes('tasks-card--collapsed'), 'Contains collapsed class');
  assert.ok(collapsedHtml.includes('background-tasks-list hidden') || collapsedHtml.includes('tasks-list--hidden'), 'List is hidden when collapsed');
});
