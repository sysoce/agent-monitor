import test from 'node:test';
import * as assert from 'node:assert/strict';
import { buildGistHeaders, isNetworkOrOfflineError } from '../src/sync/gistHttp';

test('buildGistHeaders omits Content-Type on GET and includes it on write requests', () => {
  const getHeaders = buildGistHeaders('test-token', undefined, false);
  assert.equal(getHeaders['Content-Type'], undefined);
  assert.equal(getHeaders['Authorization'], 'Bearer test-token');
  assert.equal(getHeaders['Accept'], 'application/vnd.github+json');

  const writeHeaders = buildGistHeaders('test-token', undefined, true);
  assert.equal(writeHeaders['Content-Type'], 'application/json');
});

test('buildGistHeaders includes If-None-Match when etag is provided', () => {
  const headers = buildGistHeaders('test-token', 'W/"12345"', false);
  assert.equal(headers['If-None-Match'], 'W/"12345"');
});

test('isNetworkOrOfflineError correctly identifies transient offline and network fetch errors', () => {
  assert.equal(isNetworkOrOfflineError(new TypeError('Failed to fetch')), true);
  assert.equal(isNetworkOrOfflineError(new Error('NetworkError when attempting to fetch resource')), true);
  assert.equal(isNetworkOrOfflineError(new Error('Load failed')), true);
  assert.equal(isNetworkOrOfflineError(new Error('fetch failed')), true);
  assert.equal(isNetworkOrOfflineError('Failed to fetch'), true);
  assert.equal(isNetworkOrOfflineError(new Error('GitHub Gist API error: 401 Bad credentials')), false);
  assert.equal(isNetworkOrOfflineError(new Error('GitHub Gist API error: 404 Not Found')), false);
});
