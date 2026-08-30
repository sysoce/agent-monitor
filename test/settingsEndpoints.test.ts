import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSetupRoute } from '../src/server/setupHandler';
import { buildSettingsQrUrl } from '../src/ui/components/settingsModal/settingsQrBuilder';
import type { ServerResponse } from 'node:http';
import * as path from 'node:path';

test('handleSetupRoute serves /download as standalone HTML attachment', async () => {
  let statusCode = 0;
  let headers: Record<string, any> = {};
  let bodyData: any = null;

  const mockRes = {
    writeHead: (status: number, hdrs: any) => {
      statusCode = status;
      headers = hdrs;
    },
    end: (data: any) => {
      bodyData = data;
    },
  } as unknown as ServerResponse;

  const staticDir = path.resolve(process.cwd(), 'dist');
  const url = new URL('http://localhost:4200/download');
  const handled = await handleSetupRoute(mockRes, '/download', url, path.resolve('.'), staticDir);

  assert.equal(handled, true, 'handleSetupRoute must handle /download');
  assert.equal(statusCode, 200, 'Status should be 200');
  assert.equal(headers['Content-Type'], 'text/html; charset=utf-8');
  assert.ok(headers['Content-Disposition']?.includes('agent-monitor.html'), 'Content-Disposition must specify filename');
  assert.ok(bodyData && bodyData.length > 0, 'Body data must not be empty');
});

test('handleSetupRoute serves /api/version with downloadUrl', async () => {
  let statusCode = 0;
  let bodyData = '';

  const mockRes = {
    writeHead: (status: number) => {
      statusCode = status;
    },
    end: (data: any) => {
      bodyData = String(data);
    },
  } as unknown as ServerResponse;

  const url = new URL('http://localhost:4200/api/version');
  const handled = await handleSetupRoute(mockRes, '/api/version', url, path.resolve('.'), path.resolve('dist'));

  assert.equal(handled, true);
  assert.equal(statusCode, 200);
  const parsed = JSON.parse(bodyData);
  assert.ok(parsed.version, 'Version must be present');
  assert.equal(parsed.downloadUrl, '/download');
});

test('buildSettingsQrUrl builds live real URLs with payload for all targets', () => {
  const ghUrl = buildSettingsQrUrl({ target: 'gh_pages', payload: 'testpayload' });
  assert.ok(ghUrl.startsWith('https://sysoce.github.io/agent-monitor/#setup=testpayload'));

  const lanUrl = buildSettingsQrUrl({ target: 'lan', payload: 'testpayload', selectedLanIp: 'http://192.168.1.50:4200' });
  assert.equal(lanUrl, 'http://192.168.1.50:4200/#setup=testpayload');

  const dlUrl = buildSettingsQrUrl({ target: 'download', payload: 'testpayload', origin: 'http://192.168.1.50:4200' });
  assert.ok(dlUrl.includes('/download#setup=testpayload') || dlUrl.includes('/standalone.html#setup=testpayload'));
});
