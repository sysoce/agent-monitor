import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import { GistClient } from '../src/sync/gistClient';
import { encryptSyncData } from '../src/sync/syncCrypto';
import type { SyncGistPayload, SyncInboxMessage, SyncOutboxState } from '../src/sync/types';

test('GistClient fetchSyncState handles 200 OK and 304 Not Modified with ETags', async () => {
  let requestCount = 0;
  let lastReceivedEtag = '';

  const samplePayload: SyncGistPayload = {
    inbox: [{ id: 'msg-1', sessionId: 'sess-1', content: 'hello agent', timestamp: 1000 }],
    sessions: [{ id: 'sess-1', title: 'Test Session', createdAt: 1000, updatedAt: 1000, messageCount: 1, preview: 'hello' }],
    version: 1,
    updatedAt: 1000,
  };

  const server = http.createServer((req, res) => {
    requestCount++;
    lastReceivedEtag = req.headers['if-none-match'] || '';

    if (req.headers['if-none-match'] === '"etag-v1"') {
      res.writeHead(304);
      res.end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      ETag: '"etag-v1"',
    });
    res.end(JSON.stringify({
      id: 'test-gist-id',
      files: {
        'agent-sync.json': {
          content: encryptSyncData(JSON.stringify(samplePayload), 'secret'),
        },
      },
    }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const client = new GistClient({ token: 'mock-pat', gistId: 'test-gist-id', password: 'secret' }, baseUrl);

    // Initial fetch (no ETag)
    const res1 = await client.fetchSyncState();
    assert.equal(res1.notModified, false);
    assert.equal(res1.etag, '"etag-v1"');
    assert.equal(res1.data?.inbox.length, 1);
    assert.equal(res1.data?.inbox[0]?.content, 'hello agent');

    // Second fetch with ETag (should get 304)
    const res2 = await client.fetchSyncState(res1.etag);
    assert.equal(res2.notModified, true);
    assert.equal(res2.data, null);
    assert.equal(lastReceivedEtag, '"etag-v1"');
  } finally {
    server.close();
  }
});

test('GistClient pushInboxMessage updates Gist with encrypted payload', async () => {
  let receivedPatchBody: any = null;

  const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'test-gist-id',
        files: {
          'agent-sync.json': {
            content: JSON.stringify({ inbox: [], sessions: [], version: 1, updatedAt: 500 }),
          },
        },
      }));
      return;
    }

    if (req.method === 'PATCH') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        receivedPatchBody = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'test-gist-id' }));
      });
      return;
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const client = new GistClient({ token: 'mock-pat', gistId: 'test-gist-id' }, baseUrl);
    const newMsg: SyncInboxMessage = {
      id: 'msg-2',
      sessionId: 'sess-1',
      content: 'what is the weather?',
      timestamp: 2000,
    };

    await client.pushInboxMessage(newMsg);
    assert.ok(receivedPatchBody);
    const content = JSON.parse(receivedPatchBody.files['agent-sync.json'].content);
    assert.equal(content.inbox.length, 1);
    assert.equal(content.inbox[0].content, 'what is the weather?');
  } finally {
    server.close();
  }
});

test('GistClient extracts detailed error message from GitHub API response', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Resource not accessible by personal access token',
      documentation_url: 'https://docs.github.com/rest/gists',
    }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const client = new GistClient({ token: 'mock-pat', gistId: 'test-gist-id' }, baseUrl);
    await assert.rejects(
      async () => client.fetchSyncState(),
      (err: Error) => {
        assert.ok(err.message.includes('403'));
        assert.ok(err.message.includes('Resource not accessible by personal access token'));
        return true;
      }
    );
  } finally {
    server.close();
  }
});
