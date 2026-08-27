import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { getSessionDetail } from '../src/server/sessionStore';
import { renderChatView } from '../src/ui/components/chatView';
import type { AppState } from '../src/ui/types';

test('getSessionDetail deduplicates pending incoming message when already in chat.jsonl', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-sess-dedup-'));
  try {
    const sDir = path.join(tmpDir, '.agent', 'sessions', 'sess-test');
    await fs.mkdir(path.join(sDir, 'incoming'), { recursive: true });
    await fs.writeFile(path.join(sDir, 'chat.jsonl'), JSON.stringify({ role: 'user', content: 'hello world' }) + '\n');
    await fs.writeFile(path.join(sDir, 'incoming', 'msg-1.json'), JSON.stringify({ role: 'user', content: 'hello world' }));

    const detail = await getSessionDetail(tmpDir, 'sess-test');
    assert.ok(detail);
    assert.equal(detail.messages.length, 1);
    assert.equal(detail.messages[0]?.content, 'hello world');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('getSessionDetail deduplicates multiple identical pending incoming messages', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-sess-dedup-'));
  try {
    const sDir = path.join(tmpDir, '.agent', 'sessions', 'sess-test');
    await fs.mkdir(path.join(sDir, 'incoming'), { recursive: true });
    await fs.writeFile(path.join(sDir, 'chat.jsonl'), '');
    await fs.writeFile(path.join(sDir, 'incoming', 'msg-1.json'), JSON.stringify({ role: 'user', content: 'same query' }));
    await fs.writeFile(path.join(sDir, 'incoming', 'msg-2.json'), JSON.stringify({ role: 'user', content: 'same query' }));

    const detail = await getSessionDetail(tmpDir, 'sess-test');
    assert.ok(detail);
    assert.equal(detail.messages.length, 1);
    assert.equal(detail.messages[0]?.content, 'same query');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('getSessionDetail deduplicates duplicate consecutive lines in chat.jsonl', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-sess-dedup-'));
  try {
    const sDir = path.join(tmpDir, '.agent', 'sessions', 'sess-test');
    await fs.mkdir(sDir, { recursive: true });
    await fs.writeFile(
      path.join(sDir, 'chat.jsonl'),
      JSON.stringify({ role: 'user', content: 'What is the weather?' }) + '\n' +
      JSON.stringify({ role: 'user', content: 'What is the weather?' }) + '\n' +
      JSON.stringify({ role: 'assistant', content: 'It is sunny.' }) + '\n' +
      JSON.stringify({ role: 'assistant', content: 'It is sunny.' }) + '\n'
    );

    const detail = await getSessionDetail(tmpDir, 'sess-test');
    assert.ok(detail);
    assert.equal(detail.messages.length, 2);
    assert.equal(detail.messages[0]?.content, 'What is the weather?');
    assert.equal(detail.messages[1]?.content, 'It is sunny.');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('renderChatView renders all provided session messages accurately', () => {
  const state: AppState = {
    sessions: [],
    plans: [],
    availableModels: [],
    activeTab: 'chat',
    syncStatus: 'connected',
    syncMode: 'git-backup',
    composerMode: 'agent',
    isAwaitingResponse: false,
    isSending: false,
    isAuthenticated: true,
    searchQuery: '',
    selectedModel: 'gpt-4o',
    activeSession: {
      id: 'sess-1',
      title: 'Render Test',
      createdAt: 1000,
      updatedAt: 2000,
      mode: 'agent',
      messages: [
        { role: 'user', content: 'Build a navbar' },
        { role: 'assistant', content: 'Done!' },
      ],
      plans: [],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
  };

  const html = renderChatView(state);
  const userTurns = html.match(/turn turn-user/g) || [];
  const assistantTurns = html.match(/turn turn-assistant/g) || [];
  assert.equal(userTurns.length, 1);
  assert.equal(assistantTurns.length, 1);
});


