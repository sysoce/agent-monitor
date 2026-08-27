import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { getSessionDetail } from '../src/server/sessionStore';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

class SessionJournal {
  constructor(private workspaceRoot: string, private sessionId: string) {}
  getChatLogPath(): string {
    return path.join(this.workspaceRoot, '.agent', 'sessions', this.sessionId, 'chat.jsonl');
  }
  async appendUser(content: string): Promise<void> {
    const dir = path.dirname(this.getChatLogPath());
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(this.getChatLogPath(), JSON.stringify({ role: 'user', content }) + '\n', 'utf8');
  }
  async appendAssistant(content: string, tool_calls?: any[], thought?: string): Promise<void> {
    if (!content && (!tool_calls || tool_calls.length === 0) && !thought) return;
    const dir = path.dirname(this.getChatLogPath());
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(this.getChatLogPath(), JSON.stringify({ role: 'assistant', content, tool_calls, thought }) + '\n', 'utf8');
  }
}

test('SessionJournal.appendAssistant does not append empty ghost message', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-test-'));
  try {
    const journal = new SessionJournal(tmpDir, 'sess-ghost');
    await journal.appendUser('Test user');
    await journal.appendAssistant('', [], '');
    const log = await fs.readFile(journal.getChatLogPath(), 'utf8');
    const lines = log.trim().split('\n');
    assert.equal(lines.length, 1, 'Should only contain the user message, not empty assistant');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('getSessionDetail filters out existing ghost empty assistant turns', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'detail-ghost-test-'));
  try {
    const sDir = path.join(tmpDir, '.agent', 'sessions', 'sess-ghost');
    await fs.mkdir(sDir, { recursive: true });
    await fs.writeFile(
      path.join(sDir, 'chat.jsonl'),
      JSON.stringify({ role: 'user', content: 'first' }) + '\n' +
      JSON.stringify({ role: 'assistant', content: '' }) + '\n',
      'utf8'
    );
    const detail = await getSessionDetail(tmpDir, 'sess-ghost');
    assert.ok(detail);
    assert.equal(detail.messages.length, 1, 'Ghost empty assistant message should be filtered out');
    assert.equal(detail.messages[0]?.role, 'user');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
