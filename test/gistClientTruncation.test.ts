import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import { GistClient } from '../src/sync/gistClient';
import { encryptSyncData } from '../src/sync/syncCrypto';
import type { SyncGistPayload } from '../src/sync/types';

test('GistClient fetchSyncState fetches raw_url when file is truncated', async () => {
  const samplePayload: SyncGistPayload = {
    inbox: [{ id: 'msg-trunc', sessionId: 'sess-trunc', content: 'large content', timestamp: 1000 }],
    sessions: [{ id: 'sess-trunc', title: 'Truncated Session', createdAt: 1000, updatedAt: 1000, messageCount: 5, preview: 'preview' }],
    sessionDetails: {
      'sess-trunc': {
        id: 'sess-trunc',
        title: 'Truncated Session',
        mode: 'agent',
        createdAt: 1000,
        updatedAt: 1000,
        messages: [{ role: 'user', content: 'hello from phone' }],
        filesChanged: [],
        artifacts: [],
        subagents: [],
      },
    },
    version: 1,
    updatedAt: 1000,
  };

  const encryptedFull = encryptSyncData(JSON.stringify(samplePayload), 'pass123');

  const server = http.createServer((req, res) => {
    if (req.url === '/raw-sync-file.json') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(encryptedFull);
      return;
    }

    if (req.url === '/gists/test-gist') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'test-gist',
        files: {
          'agent-sync.json': {
            truncated: true,
            raw_url: `http://127.0.0.1:${port}/raw-sync-file.json`,
            content: encryptedFull.slice(0, 100), // Incomplete / truncated content
          },
        },
      }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const client = new GistClient({ token: 'pat-123', gistId: 'test-gist', password: 'pass123' }, baseUrl);
    const { data } = await client.fetchSyncState();

    assert.ok(data);
    assert.equal(data.sessions.length, 1);
    assert.equal(data.sessions[0].id, 'sess-trunc');
    assert.equal(data.inbox.length, 1);
    assert.ok(data.sessionDetails?.['sess-trunc']);
    assert.equal(data.sessionDetails['sess-trunc'].title, 'Truncated Session');
  } finally {
    server.close();
  }
});

test('GistClient fetchSyncState provides safe array defaults when payload is partial or non-array', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'test-gist',
      files: {
        'agent-sync.json': {
          content: encryptSyncData(JSON.stringify({ test: true }), 'pass123'),
        },
      },
    }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const client = new GistClient({ token: 'pat-123', gistId: 'test-gist', password: 'pass123' }, baseUrl);
    const { data } = await client.fetchSyncState();

    assert.ok(data);
    assert.ok(Array.isArray(data.inbox));
    assert.ok(Array.isArray(data.sessions));
    assert.equal(data.inbox.length, 0);
    assert.equal(data.sessions.length, 0);
    assert.equal(data.version, 1);
  } finally {
    server.close();
  }
});
