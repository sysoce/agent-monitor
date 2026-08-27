import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { startMonitorServer } from '../src/server/server';

describe('Monitor Server HTTP API', () => {
  it('creates sessions, lists them, and posts incoming messages with model and stop support', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'monitor-http-'));
    const { server, port, close } = startMonitorServer({
      port: 0,
      workspaceRoot: tmp,
      requireAuth: false,
    });

    try {
      if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      const baseUrl = `http://127.0.0.1:${actualPort}`;

      // 1. GET /api/models
      const resModels = await fetch(`${baseUrl}/api/models`);
      assert.equal(resModels.status, 200);
      const jsonModels = (await resModels.json()) as { models: Array<{ id: string; label: string }> };
      assert.ok(jsonModels.models.length > 0);
      assert.ok(jsonModels.models.some((m) => m.label.includes('Gemini')));

      // 2. POST /api/sessions (create session)
      const resCreate = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Test Session' }),
      });
      assert.equal(resCreate.status, 201);
      const { id } = (await resCreate.json()) as { id: string };

      // 3. POST /api/sessions/:id/messages with model and mode
      const resMsg = await fetch(`${baseUrl}/api/sessions/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Hello with model',
          model: 'antigravity|gemini-3.7-flash-high|model',
          mode: 'agent',
        }),
      });
      assert.equal(resMsg.status, 200);

      // 4. POST /api/sessions/:id/stop
      const resStop = await fetch(`${baseUrl}/api/sessions/${id}/stop`, { method: 'POST' });
      assert.equal(resStop.status, 200);
      const jsonStop = (await resStop.json()) as { ok: boolean };
      assert.equal(jsonStop.ok, true);

      // 5. GET /api/sessions/:id
      const resDetail = await fetch(`${baseUrl}/api/sessions/${id}`);
      assert.equal(resDetail.status, 200);
      const jsonDetail = (await resDetail.json()) as { session: { messages: Array<{ content: string }> } };
      assert.equal(jsonDetail.session.messages.length, 1);
    } finally {
      await close();
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it('enforces password protection on protected instances', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'monitor-auth-'));
    const { server, port, close } = startMonitorServer({
      port: 0,
      workspaceRoot: tmp,
      password: 'test-secret-password',
    });

    try {
      if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      const baseUrl = `http://127.0.0.1:${actualPort}`;

      const res1 = await fetch(`${baseUrl}/api/sessions`);
      assert.equal(res1.status, 401);

      const resGoodLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test-secret-password' }),
      });
      assert.equal(resGoodLogin.status, 200);

      const resAuth = await fetch(`${baseUrl}/api/sessions`, {
        headers: { Authorization: 'Bearer test-secret-password' },
      });
      assert.equal(resAuth.status, 200);
    } finally {
      await close();
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
