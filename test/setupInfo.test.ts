import test from 'node:test';
import * as assert from 'node:assert/strict';
import { handleSetupRoute } from '../src/server/setupHandler';
import type { ServerResponse } from 'node:http';

test('handleSetupRoute handles /api/setup-info and returns setup metadata', async () => {
  let statusCode = 0;
  let headers: Record<string, string> = {};
  let responseData = '';

  const mockRes = {
    writeHead(code: number, h: Record<string, string>) {
      statusCode = code;
      headers = h;
    },
    end(data: string) {
      responseData = data;
    },
  } as unknown as ServerResponse;

  const handled = await handleSetupRoute(
    mockRes,
    '/api/setup-info',
    new URL('http://localhost:4200/api/setup-info'),
    process.cwd(),
    process.cwd(),
    'secret-pin-123',
    { token: 'ghp_test1234567890', gistId: 'gist-abc-123' }
  );

  assert.equal(handled, true);
  assert.equal(statusCode, 200);
  assert.equal(headers['Content-Type'], 'application/json');

  const json = JSON.parse(responseData);
  assert.ok(json.githubPagesUrl.includes('https://sysoce.github.io/agent-monitor/#setup='));
  assert.ok(json.lanUrl.includes('/#setup='));
  assert.ok(json.setupPayload);
  assert.equal(json.hasSyncConfig, true);
  assert.equal(json.gistId, 'gist-abc-123');
});
