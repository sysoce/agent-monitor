import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { listSessions } from '../src/server/sessionLister';
import { renderMonitorSidebarStats } from '../src/ui/components/sidebarStatsCard';
import { updateSidebarDOM } from '../src/ui/sidebarDomUpdater';
import { renderSidebarView } from '../src/ui/components/sidebarView';
import type { AppState } from '../src/ui/types';

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'sidebar',
    sessions: [
      { id: 'sess_1', title: 'Idle Session', preview: 'Prev 1', createdAt: 1000, updatedAt: 2000, messageCount: 2 },
      { id: 'sess_2', title: 'Running Session', preview: 'Prev 2', createdAt: 500, updatedAt: 1500, messageCount: 5, isGenerating: true },
      { id: 'sess_3', title: 'Recent Session', preview: 'Prev 3', createdAt: 800, updatedAt: 3000, messageCount: 3 },
    ],
    plans: [],
    syncStatus: 'connected',
    syncMode: 'live-sse',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model-a',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    attachments: [],
    ...overrides,
  };
}

test('listSessions detects running sessions and sorts running sessions to the top', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-sessions-'));
  const sessionsDir = path.join(tmpDir, '.agent', 'sessions');
  await fs.mkdir(sessionsDir, { recursive: true });

  const sessOld = path.join(sessionsDir, 'sess_old');
  await fs.mkdir(sessOld, { recursive: true });
  await fs.writeFile(path.join(sessOld, 'chat.jsonl'), JSON.stringify({ role: 'user', content: 'Old message' }) + '\n');

  const sessRecent = path.join(sessionsDir, 'sess_recent');
  await fs.mkdir(sessRecent, { recursive: true });
  await fs.writeFile(path.join(sessRecent, 'chat.jsonl'), JSON.stringify({ role: 'user', content: 'Recent message' }) + '\n');

  const sessRunning = path.join(sessionsDir, 'sess_running');
  await fs.mkdir(sessRunning, { recursive: true });
  await fs.writeFile(path.join(sessRunning, 'chat.jsonl'), JSON.stringify({ role: 'user', content: 'Running message' }) + '\n');
  await fs.writeFile(path.join(sessRunning, '.active'), JSON.stringify({ pid: 1234, startTime: Date.now() }));

  try {
    const list = await listSessions(tmpDir);
    assert.equal(list.length, 3);
    assert.equal(list[0].id, 'sess_running', 'Running session must be sorted at the top');
    assert.equal(list[0].isGenerating, true, 'Running session must have isGenerating = true');
    assert.equal(list[1].id, 'sess_recent');
    assert.equal(list[2].id, 'sess_old');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('renderMonitorSidebarStats calculates running agent count and stats with activeSession sync', () => {
  const state = createMockState({
    activeSessionId: 'sess_1',
    activeSession: {
      id: 'sess_1',
      title: 'Idle Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 4000,
      messages: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'thinking...' }],
      filesChanged: [],
      artifacts: [{ name: 'plan.md', path: '/plan.md', type: 'plan' }],
      subagents: [],
      isGenerating: true,
    },
  });

  const html = renderMonitorSidebarStats(state);
  assert.ok(html.includes('data-filter-tab="running"'), 'Should render running filter tab');
  assert.ok(html.includes('<span class="stat-value">2</span>'), 'Should count both sess_2 and active generating sess_1 as running');
  assert.ok(html.includes('<span class="stat-value">3</span>'), 'Total 3 sessions');
  assert.ok(html.includes('<span class="stat-value">1</span>'), 'Total 1 artifact from active session');
});

test('updateSidebarDOM patches .sidebar-stats-widget when session stats change', () => {
  let statsOuterHtml = '<div class="sidebar-stats-widget"><div class="stat-value">0</div></div>';
  const statsWidget: any = {
    className: 'sidebar-stats-widget',
    get outerHTML() { return statsOuterHtml; },
    set outerHTML(val: string) { statsOuterHtml = val; },
  };

  const sidebarEl: any = {
    className: 'sidebar-view',
    querySelector(sel: string) {
      if (sel === '.sidebar-stats-widget' || sel === '.monitor-stats-widget') return statsWidget;
      if (sel === '#session-search') return { value: '' };
      if (sel === '.session-list') return { dataset: {}, set innerHTML(_v: string) {} };
      return null;
    },
    querySelectorAll() { return []; },
  };

  const container: any = {
    querySelector(sel: string) {
      if (sel === '.sidebar-view') return sidebarEl;
      return null;
    },
    dataset: {},
  };

  const state = createMockState({
    sessions: [
      { id: 'sess_running', title: 'Running Task', preview: 'working', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 4, isGenerating: true },
    ],
  });

  updateSidebarDOM(state, container);
  assert.ok(statsOuterHtml.includes('class="stat-value">1</span>'), 'Stats widget outerHTML must be updated with running count 1');
});

test('renderSidebarView sorts running sessions first and displays running status', () => {
  const state = createMockState();
  const html = renderSidebarView(state);

  const runningIdx = html.indexOf('data-session-id="sess_2"');
  const recentIdx = html.indexOf('data-session-id="sess_3"');
  const idleIdx = html.indexOf('data-session-id="sess_1"');

  assert.ok(runningIdx < recentIdx, 'sess_2 (running) must appear before sess_3 (recent)');
  assert.ok(recentIdx < idleIdx, 'sess_3 (recent) must appear before sess_1 (older)');
  assert.ok(html.includes('session-spinner'), 'Running session card must display running status indicator');
});
