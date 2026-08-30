import test from 'node:test';
import * as assert from 'node:assert/strict';
import { calculateDashboardStats, renderSidebarStats } from '../src/ui/sidebar/sidebarStatsRender';
import { groupSessionsByRecency, partitionSessionsByFilter } from '../src/ui/sidebar/sidebarSessionGroups';
import { renderSessionRow } from '../src/ui/sidebar/sidebarSessionRow';
import { renderDashboardArtifactsSection } from '../src/ui/sidebar/sidebarArtifactsRender';
import { renderDashboardResults } from '../src/ui/sidebar/sidebarDashboardRender';
import type { AppState } from '../src/ui/types';

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'sidebar',
    activeFilterTab: 'all',
    sessions: [
      { id: 'sess_running', title: 'Running Session', preview: 'Working on task', createdAt: Date.now() - 60000, updatedAt: Date.now() - 30000, messageCount: 4, isGenerating: true },
      { id: 'sess_pinned', title: 'Pinned Session', preview: 'Important notes', createdAt: Date.now() - 3600000, updatedAt: Date.now() - 1800000, messageCount: 2 },
      { id: 'sess_today', title: 'Today Session', preview: 'Recent conversation', createdAt: Date.now() - 7200000, updatedAt: Date.now() - 3600000, messageCount: 5 },
      { id: 'sess_older', title: 'Older Session', preview: 'Old conversation', createdAt: Date.now() - 864000000, updatedAt: Date.now() - 864000000, messageCount: 1 },
    ],
    pinnedSessionIds: ['sess_pinned'],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    attachments: [],
    ...overrides,
  };
}

test('calculateDashboardStats counts running, pinned, total sessions, and artifacts correctly', () => {
  const state = createMockState();
  const stats = calculateDashboardStats(state);
  assert.equal(stats.runningCount, 1);
  assert.equal(stats.pinnedCount, 1);
  assert.equal(stats.totalSessions, 4);
  assert.equal(stats.artifactsCount, 0);
});

test('renderSidebarStats renders 4 filter tab buttons with counts and active state', () => {
  const stats = {
    runningCount: 2,
    pinnedCount: 1,
    totalSessions: 10,
    totalMessages: 40,
    artifactsCount: 5,
  };

  const html = renderSidebarStats(stats, 'running');
  assert.match(html, /class="stat-card\s+active\s+type-running\s+has-items"/);
  assert.match(html, /data-filter-tab="all"/);
  assert.match(html, /data-filter-tab="running"/);
  assert.match(html, /data-filter-tab="pinned"/);
  assert.match(html, /data-filter-tab="artifacts"/);
  assert.match(html, /<span class="stat-value">2<\/span>/);
  assert.match(html, /<span class="stat-value">10<\/span>/);
});

test('partitionSessionsByFilter and groupSessionsByRecency organize sessions correctly', () => {
  const now = Date.now();
  const sessions = [
    { id: 's1', title: 'Running 1', updatedAt: now, isRunning: true, isPinned: false },
    { id: 's2', title: 'Pinned 1', updatedAt: now - 1000, isRunning: false, isPinned: true },
    { id: 's3', title: 'Today 1', updatedAt: now - 2000, isRunning: false, isPinned: false },
  ];

  const partAll = partitionSessionsByFilter(sessions as any, 'all');
  assert.equal(partAll.running.length, 1);
  assert.equal(partAll.pinned.length, 1);
  assert.equal(partAll.recent.length, 1);

  const partRunning = partitionSessionsByFilter(sessions as any, 'running');
  assert.equal(partRunning.recent.length, 1);
  assert.equal(partRunning.recent[0].id, 's1');
});

test('renderDashboardResults with activeFilterTab="running" ONLY renders running sessions', () => {
  const state = createMockState({ activeFilterTab: 'running' });
  const html = renderDashboardResults(state);

  assert.match(html, /Running Session/);
  assert.doesNotMatch(html, /Pinned Session/);
  assert.doesNotMatch(html, /Today Session/);
  assert.doesNotMatch(html, /Older Session/);
});

test('renderDashboardResults with activeFilterTab="pinned" ONLY renders pinned sessions', () => {
  const state = createMockState({ activeFilterTab: 'pinned' });
  const html = renderDashboardResults(state);

  assert.match(html, /Pinned Session/);
  assert.doesNotMatch(html, /Running Session/);
  assert.doesNotMatch(html, /Today Session/);
  assert.doesNotMatch(html, /Older Session/);
});

test('renderDashboardResults with activeFilterTab="all" renders recency grouped sessions', () => {
  const state = createMockState({ activeFilterTab: 'all' });
  const html = renderDashboardResults(state);

  assert.match(html, /Running Session/);
  assert.match(html, /Pinned Session/);
  assert.match(html, /Today Session/);
  assert.match(html, /Older Session/);
  assert.match(html, /Running/);
  assert.match(html, /Pinned/);
});

test('renderDashboardResults with activeFilterTab="artifacts" renders artifacts section', () => {
  const state = createMockState({
    activeFilterTab: 'artifacts',
    activeSession: {
      id: 'sess_running',
      title: 'Running',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [],
      filesChanged: [],
      artifacts: [{ name: 'plan.md', path: 'artifacts/plan.md', type: 'plan' }],
      subagents: [],
    },
  });
  const html = renderDashboardResults(state);
  assert.match(html, /plan\.md/);
  assert.match(html, /data-open-artifact="artifacts\/plan\.md"/);
});
