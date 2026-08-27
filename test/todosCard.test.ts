import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderTodosCard, todoStats } from '../src/ui/components/todosCard';

test('todoStats calculates completion metrics correctly', () => {
  const stats = todoStats([
    { id: '1', title: 'Task 1', status: 'completed' },
    { id: '2', title: 'Task 2', status: 'done' },
    { id: '3', title: 'Task 3', status: 'in_progress' },
    { id: '4', title: 'Task 4', status: 'pending' },
  ]);
  assert.equal(stats.total, 4);
  assert.equal(stats.completed, 2);
  assert.equal(stats.inProgress, 1);
  assert.equal(stats.allFinished, false);
});

test('renderTodosCard renders tasks, progress and items', () => {
  const html = renderTodosCard([
    { id: '1', title: 'Setup database', status: 'completed' },
    { id: '2', title: 'Run migrations', status: 'pending' },
  ], { isBuild: false });

  assert.match(html, /todos-card/);
  assert.match(html, /Tasks/);
  assert.match(html, /1\/2 completed/);
  assert.match(html, /Setup database/);
  assert.match(html, /is-done/);
  assert.match(html, /Run migrations/);
  assert.match(html, /is-pending/);
});

test('renderTodosCard renders Build Plan header when isBuild is true', () => {
  const html = renderTodosCard([
    { id: '1', title: 'Implement feature', status: 'in_progress' },
  ], { isBuild: true });

  assert.match(html, /Build Plan/);
  assert.match(html, /todos-card--build/);
  assert.match(html, /is-in-progress/);
});
