import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { isAgentRunning, renderComposerActionsHtml } from '../src/ui/composerButton';
import { applyAbortSuppression } from '../src/ui/sessionAbortSuppression';
import { listSessions } from '../src/server/sessionLister';
import { getSessionDetail } from '../src/server/sessionStore';
import type { AppState } from '../src/ui/types';
import type { SessionDetail } from '../src/server/types';

test('isAgentRunning detects active state across all running indicators', () => {
  const baseState: AppState = {
    activeTab: 'chat',
    sessions: [{ id: 'sess-1', title: 'S1', createdAt: 100, updatedAt: 200, messageCount: 1, preview: '' }],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'gemini',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  assert.equal(isAgentRunning(baseState), false, 'Idle state should not be running');

  // isSending / isAwaitingResponse
  assert.equal(isAgentRunning({ ...baseState, isSending: true }), true, 'isSending is running');
  assert.equal(isAgentRunning({ ...baseState, isAwaitingResponse: true }), true, 'isAwaitingResponse is running');

  // activeSession.isGenerating
  assert.equal(
    isAgentRunning({
      ...baseState,
      activeSessionId: 'sess-1',
      activeSession: { id: 'sess-1', title: 'S1', mode: 'agent', createdAt: 100, updatedAt: 200, isGenerating: true, messages: [], filesChanged: [], artifacts: [], subagents: [] },
    }),
    true,
    'activeSession.isGenerating is running'
  );

  // sessions summary isGenerating
  assert.equal(
    isAgentRunning({
      ...baseState,
      activeSessionId: 'sess-1',
      sessions: [{ id: 'sess-1', title: 'S1', createdAt: 100, updatedAt: 200, messageCount: 1, preview: '', isGenerating: true }],
    }),
    true,
    'Session summary isGenerating is running'
  );

  // running subagent
  assert.equal(
    isAgentRunning({
      ...baseState,
      activeSessionId: 'sess-1',
      activeSession: {
        id: 'sess-1', title: 'S1', mode: 'agent', createdAt: 100, updatedAt: 200, isGenerating: false, messages: [], filesChanged: [], artifacts: [],
        subagents: [{ id: 'sub-1', role: 'Worker', status: 'running' }],
      },
    }),
    true,
    'Running subagent is running'
  );

  // running background task
  assert.equal(
    isAgentRunning({
      ...baseState,
      activeSessionId: 'sess-1',
      activeSession: {
        id: 'sess-1', title: 'S1', mode: 'agent', createdAt: 100, updatedAt: 200, isGenerating: false, messages: [], filesChanged: [], artifacts: [], subagents: [],
        backgroundTasks: [{ id: 'bg-1', name: 'npm test', status: 'running' }],
      },
    }),
    true,
    'Running background task is running'
  );

  // assistant message marked isLive
  assert.equal(
    isAgentRunning({
      ...baseState,
      activeSessionId: 'sess-1',
      activeSession: {
        id: 'sess-1', title: 'S1', mode: 'agent', createdAt: 100, updatedAt: 200, isGenerating: false,
        messages: [
          { role: 'user', content: 'run tests' },
          { role: 'assistant', content: 'Thinking...', isLive: true } as any,
        ],
        filesChanged: [], artifacts: [], subagents: [],
      },
    }),
    true,
    'Live draft message is running'
  );
});

test('applyAbortSuppression expires and scopes aborts properly', () => {
  const detail: SessionDetail = {
    id: 'sess-target',
    title: 'Target',
    mode: 'agent',
    createdAt: 1000,
    updatedAt: 1500,
    isGenerating: true,
    messages: [{ role: 'user', content: 'hello', timestamp: 1000 } as any],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  // 1. Fresh abort for target session -> suppresses
  const suppressed = applyAbortSuppression(detail, Date.now() - 500, 'sess-target');
  assert.equal(suppressed.isGenerating, false, 'Fresh abort should suppress isGenerating');

  // 2. Abort for different session -> does NOT suppress
  const otherSession = applyAbortSuppression(detail, Date.now() - 500, 'sess-different');
  assert.equal(otherSession.isGenerating, true, 'Abort for different session must not suppress');

  // 3. Expired abort (>10s old) -> does NOT suppress
  const expired = applyAbortSuppression(detail, Date.now() - 15_000, 'sess-target');
  assert.equal(expired.isGenerating, true, 'Expired abort (>10s) must not suppress');

  // 4. Detail updated after abort -> does NOT suppress
  const newerDetail = applyAbortSuppression({ ...detail, updatedAt: Date.now() + 5000 }, Date.now(), 'sess-target');
  assert.equal(newerDetail.isGenerating, true, 'Session updated after abort must not suppress');
});

test('server listSessions and getSessionDetail detect active session even if past .aborted exists', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'monitor-stop-test-'));
  const sessDir = path.join(tmpDir, '.agent', 'sessions', 'sess-resumed');
  await fs.mkdir(sessDir, { recursive: true });

  const chatPath = path.join(sessDir, 'chat.jsonl');
  await fs.writeFile(chatPath, JSON.stringify({ role: 'user', content: 'first prompt' }) + '\n', 'utf8');

  // Write an old .aborted file
  const pastAbortTime = Date.now() - 10_000;
  await fs.writeFile(path.join(sessDir, '.aborted'), JSON.stringify({ abortedAt: pastAbortTime }), 'utf8');

  // Now a new turn starts: .active is written with fresh timestamp
  await fs.writeFile(path.join(sessDir, '.active'), JSON.stringify({ active: true, startedAt: Date.now() }), 'utf8');

  const summaries = await listSessions(tmpDir);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.isGenerating, true, 'listSessions must mark session as generating when .active is newer than .aborted');

  const detail = await getSessionDetail(tmpDir, 'sess-resumed');
  assert.ok(detail);
  assert.equal(detail.isGenerating, true, 'getSessionDetail must mark session as generating when .active is newer than .aborted');

  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('renderComposerActionsHtml renders stop button cleanly', () => {
  const runningState: AppState = {
    activeTab: 'chat',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'gemini',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    isAwaitingResponse: true,
  };

  const idleState: AppState = { ...runningState, isAwaitingResponse: false };

  const runningActionsHtml = renderComposerActionsHtml(runningState, '');
  assert.ok(runningActionsHtml.includes('btn-stop'), 'Running state should render stop button');
  assert.ok(!runningActionsHtml.includes('btn-send'), 'Running state without text should not render send button');

  const runningTypingActionsHtml = renderComposerActionsHtml(runningState, 'queuing message');
  assert.ok(runningTypingActionsHtml.includes('btn-stop'), 'Running state with text should include stop button');
  assert.ok(runningTypingActionsHtml.includes('btn-send'), 'Running state with text should include send/queue button');

  const idleActionsHtml = renderComposerActionsHtml(idleState, '');
  assert.ok(!idleActionsHtml.includes('btn-stop'), 'Idle state should not render stop button');
  assert.ok(idleActionsHtml.includes('btn-send'), 'Idle state should render send button');
});
