import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import { GistClient } from '../src/sync/gistClient';
import { encryptSyncData } from '../src/sync/syncCrypto';
import { decompressPayload } from '../src/sync/payloadCompressor';
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

    if (requestCount === 1) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'ETag': 'W/"abc123"',
      });
      res.end(JSON.stringify({
        files: {
          'agent-sync.json': {
            content: JSON.stringify(samplePayload),
          },
        },
      }));
      return;
    }

    if (requestCount === 2) {
      assert.equal(lastReceivedEtag, 'W/"abc123"');
      res.writeHead(304);
      res.end();
      return;
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const client = new GistClient({ token: 'mock-pat', gistId: 'test-gist-id' }, baseUrl);

    // First fetch: gets data and new etag
    const res1 = await client.fetchSyncState();
    assert.equal(res1.notModified, false);
    assert.equal(res1.etag, 'W/"abc123"');
    assert.equal(res1.data?.inbox.length, 1);
    assert.equal(res1.data?.inbox[0].content, 'hello agent');

    // Second fetch with etag: returns notModified
    const res2 = await client.fetchSyncState(res1.etag);
    assert.equal(res2.notModified, true);
    assert.equal(res2.data, null);
  } finally {
    server.close();
  }
});

test('GistClient pushInboxMessage updates Gist with encrypted payload', async () => {
  let receivedPatchBody: any = null;
  const existingPayload: SyncGistPayload = {
    inbox: [{ id: 'msg-1', sessionId: 'sess-1', content: 'previous message', timestamp: 1000 }],
    sessions: [],
    version: 1,
    updatedAt: 1000,
  };

  const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        files: {
          'agent-sync.json': {
            content: JSON.stringify(existingPayload),
          },
        },
      }));
      return;
    }

    if (req.method === 'PATCH') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
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
    const rawContent = receivedPatchBody.files['agent-sync.json'].content;
    const jsonStr = rawContent.startsWith('cz:') ? await decompressPayload(rawContent) : rawContent;
    const content = JSON.parse(jsonStr);
    assert.equal(content.inbox.length, 2);
    assert.equal(content.inbox[1].content, 'what is the weather?');
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
