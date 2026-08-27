import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { listSessions, getSessionDetail, createSession } from '../src/server/sessionStore';

describe('Monitor sessionStore', () => {
  it('returns empty list when sessions dir does not exist', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sess-store-none-'));
    try {
      const list = await listSessions(tmp);
      assert.deepEqual(list, []);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it('lists sessions and retrieves session details with artifacts and tool calls', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sess-store-list-'));
    try {
      const sessId = await createSession(tmp);
      const chatPath = path.join(tmp, '.agent', 'sessions', sessId, 'chat.jsonl');
      await fs.writeFile(
        chatPath,
        JSON.stringify({ role: 'user', content: 'Build auth module' }) + '\n'
      );
      
      const assistantMsg = {
        role: 'assistant',
        content: 'I will modify auth.ts',
        tool_calls: [
          {
            id: 'call_1',
            name: 'write_file',
            args: { target_file: 'src/auth.ts', content: 'export const auth = true;' },
          },
          {
            id: 'call_2',
            name: 'write_file',
            args: { target_file: '.agent/plans/auth.plan.md', content: '# Auth Plan' },
          },
        ],
      };
      await fs.appendFile(chatPath, JSON.stringify(assistantMsg) + '\n');

      const list = await listSessions(tmp);
      assert.equal(list.length, 1);
      assert.equal(list[0]?.id, sessId);
      assert.equal(list[0]?.preview, 'Build auth module');
      assert.ok(list[0]?.plans && list[0]?.plans.some((p) => p.name === 'auth.plan.md'));

      const detail = await getSessionDetail(tmp, sessId);
      assert.ok(detail);
      assert.equal(detail.messages.length, 2);
      assert.ok(detail.filesChanged.some((f) => f.path === 'src/auth.ts'));
      assert.ok(detail.artifacts.some((a) => a.path === '.agent/plans/auth.plan.md'));
      assert.ok(detail.plans && detail.plans.some((p) => p.name === 'auth.plan.md'));
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it('reads session when stored as session.jsonl', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sess-store-legacy-'));
    try {
      const sessDir = path.join(tmp, '.agent', 'sessions', 'subagent-123');
      await fs.mkdir(sessDir, { recursive: true });
      await fs.writeFile(
        path.join(sessDir, 'session.jsonl'),
        JSON.stringify({ role: 'user', content: 'Subagent prompt' }) + '\n' +
        JSON.stringify({ role: 'assistant', content: 'Subagent result' }) + '\n'
      );

      const list = await listSessions(tmp);
      assert.equal(list.length, 1);
      assert.equal(list[0]?.id, 'subagent-123');
      assert.equal(list[0]?.preview, 'Subagent prompt');

      const detail = await getSessionDetail(tmp, 'subagent-123');
      assert.ok(detail);
      assert.equal(detail.messages.length, 2);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it('marks isGenerating true when .active file exists in session directory', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sess-store-active-'));
    try {
      const sessId = await createSession(tmp);
      const sessDir = path.join(tmp, '.agent', 'sessions', sessId);
      await fs.writeFile(
        path.join(sessDir, 'chat.jsonl'),
        JSON.stringify({ role: 'user', content: 'Do task' }) + '\n' +
        JSON.stringify({ role: 'assistant', content: 'Thinking...', tool_calls: [{ id: '1', name: 'read_file', args: {} }] }) + '\n'
      );
      // Create active marker file
      await fs.writeFile(path.join(sessDir, '.active'), JSON.stringify({ active: true, startedAt: Date.now() }), 'utf8');

      const detail = await getSessionDetail(tmp, sessId);
      assert.ok(detail);
      assert.equal(detail.isGenerating, true);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it('enriches thinking from <thought> tags in assistant messages', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sess-store-thought-'));
    try {
      const sessId = await createSession(tmp);
      const sessDir = path.join(tmp, '.agent', 'sessions', sessId);
      await fs.writeFile(
        path.join(sessDir, 'chat.jsonl'),
        JSON.stringify({ role: 'user', content: 'Solve puzzle' }) + '\n' +
        JSON.stringify({ role: 'assistant', content: '<thought>I should evaluate alternatives.</thought>Here is the solution.' }) + '\n'
      );

      const detail = await getSessionDetail(tmp, sessId);
      assert.ok(detail);
      const assistantMsg = detail.messages[1] as any;
      assert.equal(assistantMsg.thought, 'I should evaluate alternatives.');
      assert.equal(assistantMsg.content, 'Here is the solution.');
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});

