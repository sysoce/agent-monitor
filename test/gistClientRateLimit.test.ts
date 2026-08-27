import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import { GistClient } from '../src/sync/gistClient';

test('GistClient detects rate limit headers and blocks polling requests', async () => {
  let callCount = 0;
  const server = http.createServer((_req, res) => {
    callCount++;
    res.writeHead(403, {
      'Content-Type': 'application/json',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(Math.floor((Date.now() + 60000) / 1000)),
    });
    res.end(JSON.stringify({ message: 'API rate limit exceeded' }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const client = new GistClient({ token: 'mock-pat', gistId: 'test-gist-id' }, baseUrl);

    // First call triggers 403 and sets rate limit flag
    await assert.rejects(async () => client.fetchSyncState());
    assert.equal(callCount, 1);
    assert.equal(client.isBlockedByRateLimit(), true);

    // Second call should short-circuit and return notModified without network request
    const res = await client.fetchSyncState();
    assert.equal(res.notModified, true);
    assert.equal(callCount, 1, 'Should not make HTTP request while rate-limited');
  } finally {
    server.close();
  }
});

test('GistClient clears rate limit flag when response has positive remaining quota', async () => {
  let callCount = 0;
  const server = http.createServer((_req, res) => {
    callCount++;
    if (callCount === 1) {
      res.writeHead(403, {
        'Content-Type': 'application/json',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 60000) / 1000)),
      });
      res.end(JSON.stringify({ message: 'API rate limit exceeded' }));
    } else {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 60000) / 1000)),
      });
      res.end(JSON.stringify({ files: { 'agent-sync.json': { content: '' } } }));
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const client = new GistClient({ token: 'mock-pat', gistId: 'test-gist-id' }, baseUrl);
    await assert.rejects(async () => client.fetchSyncState());
    assert.equal(client.isBlockedByRateLimit(), true);

    // After reset time passed, next successful call with positive remaining unblocks
    (client as any).rateLimitReset = Date.now() - 1000;
    assert.equal(client.isBlockedByRateLimit(), false);

    await client.fetchSyncState();
    assert.equal(client.isBlockedByRateLimit(), false);
  } finally {
    server.close();
  }
});

