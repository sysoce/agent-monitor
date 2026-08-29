import test from 'node:test';
import * as assert from 'node:assert/strict';
import type { AppState } from '../src/ui/types';
import { renderNavHeader } from '../src/ui/components/navHeader';
import { renderSidebarView } from '../src/ui/components/sidebarView';
import { renderSessionDetailView } from '../src/ui/components/sessionDetailView';
import { renderChatView } from '../src/ui/components/chatView';
import { renderToolCard, renderPlanCard } from '../src/ui/components/toolCard';
import { renderPlanView } from '../src/ui/components/planView';
import { renderComposerView } from '../src/ui/components/composerView';
import { renderLoginView } from '../src/ui/components/loginView';

const mockState: AppState = {
  activeTab: 'chat',
  sessions: [{ id: 'session-123', title: 'Fix auth bug', preview: 'auth.ts fix', createdAt: Date.now() - 120000, updatedAt: Date.now() - 60000, messageCount: 4 }],
  activeSessionId: 'session-123',
  activeSession: {
    id: 'session-123',
    title: 'Fix authentication bug',
    mode: 'agent',
    createdAt: Date.now() - 120000,
    updatedAt: Date.now() - 60000,
    messages: [
      { role: 'user', content: 'Please fix the auth bug' },
      {
        role: 'assistant',
        content: 'I will analyze the issue and generate a plan.',
        thought: 'First checking the server token logic...',
        tool_calls: [{ id: 'tc-1', name: 'write_file', args: { target_file: 'docs/auth.plan.md', content: '# Plan' } }],
      } as any,
    ],
    filesChanged: [{ path: 'src/server/auth.ts', status: 'modified' }, { path: 'test/auth.test.ts', status: 'added' }],
    artifacts: [{ name: 'auth_spec.md', path: 'artifacts/auth_spec.md', type: 'artifact' }],
    subagents: [{ id: 'sub-1', role: 'Security Reviewer', summary: 'Checked hash', status: 'completed' }],
    plans: [{ name: 'auth.plan.md', title: 'Authentication Plan', path: '.agent/plans/auth.plan.md', updatedAt: 2000, sizeBytes: 1024 }],
  },
  plans: [{ name: 'auth.plan.md', title: 'Authentication Plan', path: '.agent/plans/auth.plan.md', updatedAt: 2000, sizeBytes: 1024 }],
  activePlanName: undefined,
  activePlan: undefined,
  syncStatus: 'connected',
  searchQuery: '',
  composerMode: 'agent',
  selectedModel: 'antigravity|gemini-3.7-flash-high|model',
  availableModels: [
    { id: 'antigravity|gemini-3.7-flash-high|model', label: 'Gemini 3.7 Flash High', provider: 'Antigravity' },
    { id: 'anthropic|claude-3-7-sonnet|model', label: 'Claude 3.7 Sonnet', provider: 'Anthropic' },
  ],
  isSending: false,
  isAuthenticated: true,
};

test('renderNavHeader renders brand, live status pill and active tabs across 3 modes', () => {
  const html = renderNavHeader(mockState);
  assert.match(html, /Agent Monitor/);
  assert.match(html, /btn-toggle-sync/);
  assert.match(html, /Live/);
  assert.match(html, /data-tab="chat"[^>]*class="[^"]*active/);

  const gitHtml = renderNavHeader({ ...mockState, syncMode: 'git-backup' });
  assert.match(gitHtml, /Gist Sync/);
  assert.match(gitHtml, /status-git-backup/);

  const p2pHtml = renderNavHeader({ ...mockState, syncMode: 'p2p' });
  assert.match(p2pHtml, /P2P/);
  assert.match(p2pHtml, /status-p2p/);
});

test('renderSidebarView renders session cards with title and badges', () => {
  const html = renderSidebarView(mockState);
  assert.match(html, /Fix auth bug/);
  assert.match(html, /2 msgs/);
});

test('renderSessionDetailView renders files, subagents with status and plan navigation', () => {
  const html = renderSessionDetailView(mockState.activeSession!);
  assert.match(html, /auth\.ts/);
  assert.match(html, /Security Reviewer/);
  assert.match(html, /data-open-file="src\/server\/auth\.ts"/);
  assert.match(html, /auth\.plan\.md/);
});


test('renderChatView renders user bubbles and thoughts', () => {
  const html = renderChatView(mockState);
  assert.match(html, /Please fix the auth bug/);
  assert.match(html, /I will analyze the issue/);
  assert.match(html, /activity-toggle--thought/);
});

test('renderChatView isolates generating indicator to target awaiting session only', () => {
  const otherSessionState: AppState = {
    ...mockState,
    isAwaitingResponse: true,
    awaitingSessionId: 'sess-other-generating',
    activeSession: {
      id: 'session-123',
      title: 'Fix authentication bug',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'done' }],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      plans: [],
    },
  };
  const html = renderChatView(otherSessionState);
  assert.doesNotMatch(html, /generating-indicator/);
});

test('renderToolCard renders subagents and file action labels', () => {
  const subHtml = renderToolCard({ id: 'tc-sub', name: 'invoke_subagent', args: { Subagents: [{ Role: 'Code Reviewer', Prompt: 'Check tests' }] } });
  assert.match(subHtml, /Code Reviewer/);

  const fileHtml = renderToolCard({ id: 'tc-f', name: 'write_file', args: { target_file: 'src/app.ts' } });
  assert.match(fileHtml, /Edited src\/app\.ts/);
});

test('renderComposerView renders model selector pill, mode button, and send button', () => {
  const html = renderComposerView(mockState);
  assert.match(html, /composer-card/);
  assert.match(html, /btn-mode-toggle/);
  assert.match(html, /btn-model-toggle/);
  assert.match(html, /Gemini 3\.7 Flash High/);
  assert.match(html, /btn-send/);
});

test('renderComposerView renders model dropdown when open', () => {
  const openState = { ...mockState, isModelPickerOpen: true };
  const html = renderComposerView(openState);
  assert.match(html, /model-picker-dropdown/);
  assert.match(html, /Claude 3\.7 Sonnet/);
});

test('renderComposerView renders stop button when session is generating', () => {
  const runningState: AppState = {
    ...mockState,
    activeSession: { ...mockState.activeSession!, isGenerating: true },
  };
  const html = renderComposerView(runningState);
  assert.match(html, /btn-stop/);
  assert.match(html, /Stop/);
});

test('renderLoginView renders password input and submit button', () => {
  const unauthState: AppState = { ...mockState, isAuthenticated: false, authError: 'Bad password' };
  const html = renderLoginView(unauthState);
  assert.match(html, /login-password-input/);
  assert.match(html, /Bad password/);
});
