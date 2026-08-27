import test from 'node:test';
import * as assert from 'node:assert/strict';
import { createSecretGist, verifyGistAccess } from '../src/sync/gistCreator';

test('gistCreator createSecretGist sends expected payload and returns gistId', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedBody: any = null;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedBody = JSON.parse(String(init?.body || '{}'));
    return {
      ok: true,
      json: async () => ({ id: 'new_gist_id_999', html_url: 'https://gist.github.com/new_gist_id_999' }),
    } as Response;
  }) as typeof fetch;

  try {
    const res = await createSecretGist('test-token-123', '{"custom":1}');
    assert.equal(capturedUrl, 'https://api.github.com/gists');
    assert.equal(capturedBody.public, false);
    assert.ok(capturedBody.files['agent-sync.json']);
    assert.equal(capturedBody.files['agent-sync.json'].content, '{"custom":1}');
    assert.equal(res.gistId, 'new_gist_id_999');
    assert.equal(res.htmlUrl, 'https://gist.github.com/new_gist_id_999');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('gistCreator verifyGistAccess returns true on 200 and false on error', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => ({ ok: true, json: async () => ({}) } as Response)) as typeof fetch;
    assert.equal(await verifyGistAccess('tok', 'gist123'), true);

    globalThis.fetch = (async () => ({ ok: false, status: 404 } as Response)) as typeof fetch;
    assert.equal(await verifyGistAccess('tok', 'gist123'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
