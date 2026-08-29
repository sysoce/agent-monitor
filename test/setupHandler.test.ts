import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { handleSetupRoute } from '../src/server/setupHandler';

test('handleSetupRoute serves /setup HTML page with QR code and instructions', async () => {
  let statusCode = 0;
  let headers: Record<string, string> = {};
  let body = '';

  const mockRes: any = {
    writeHead: (code: number, h: Record<string, string>) => {
      statusCode = code;
      headers = h;
    },
    end: (content: string) => {
      body = content;
    },
  };

  const handled = await handleSetupRoute(
    mockRes,
    '/setup',
    new URL('http://localhost:4200/setup'),
    process.cwd(),
    'dist/monitor',
    'pass123',
    { token: 'tok_abc', gistId: 'gist_123', password: 'pass123' }
  );

  assert.equal(handled, true);
  assert.equal(statusCode, 200);
  assert.equal(headers['Content-Type'], 'text/html; charset=utf-8');
  assert.ok(body.includes('Agent Monitor Mobile Setup'));
  assert.ok(body.includes('<svg'));
  assert.ok(body.includes('Add to Home Screen'));
  assert.ok(body.includes('Download Offline App (HTML)'));
});

test('handleSetupRoute serves /qr raw SVG image', async () => {
  let statusCode = 0;
  let headers: Record<string, string> = {};
  let body = '';

  const mockRes: any = {
    writeHead: (code: number, h: Record<string, string>) => {
      statusCode = code;
      headers = h;
    },
    end: (content: string) => {
      body = content;
    },
  };

  const handled = await handleSetupRoute(
    mockRes,
    '/qr',
    new URL('http://localhost:4200/qr'),
    process.cwd(),
    'dist/monitor',
    'pass123',
    { token: 'tok_abc', gistId: 'gist_123', password: 'pass123' }
  );

  assert.equal(handled, true);
  assert.equal(statusCode, 200);
  assert.equal(headers['Content-Type'], 'image/svg+xml');
  assert.ok(body.startsWith('<svg'));
});

test('handleSetupRoute serves /download with Content-Disposition attachment', async () => {
  let statusCode = 0;
  let headers: Record<string, string> = {};
  let body = '';

  const mockRes: any = {
    writeHead: (code: number, h: Record<string, string>) => {
      statusCode = code;
      headers = h;
    },
    end: (content: Buffer | string) => {
      body = typeof content === 'string' ? content : content.toString('utf8');
    },
  };

  const handled = await handleSetupRoute(
    mockRes,
    '/download',
    new URL('http://localhost:4200/download'),
    process.cwd(),
    'dist',
    'pass123',
    { token: 'tok_abc', gistId: 'gist_123', password: 'pass123' }
  );

  assert.equal(handled, true);
  assert.equal(statusCode, 200);
  assert.equal(headers['Content-Type'], 'text/html; charset=utf-8');
  assert.equal(headers['Content-Disposition'], 'attachment; filename="agent-monitor.html"');
  assert.ok(body.includes('<!DOCTYPE html>'));
});

test('handleSetupRoute serves /api/version with agent-monitor package version, ignoring workspaceRoot version', async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mock-workspace-'));
  await fs.promises.writeFile(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'other-app', version: '9.9.9' })
  );

  try {
    let statusCode = 0;
    let headers: Record<string, string> = {};
    let body = '';

    const mockRes: any = {
      writeHead: (code: number, h: Record<string, string>) => {
        statusCode = code;
        headers = h;
      },
      end: (content: string) => {
        body = content;
      },
    };

    const handled = await handleSetupRoute(
      mockRes,
      '/api/version',
      new URL('http://localhost:4200/api/version'),
      tmpDir,
      'dist',
      'pass123'
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.equal(headers['Content-Type'], 'application/json');

    const pkg = JSON.parse(await fs.promises.readFile(path.resolve(__dirname, '../package.json'), 'utf8'));
    const data = JSON.parse(body);
    assert.equal(data.version, pkg.version);
    assert.equal(data.downloadUrl, '/download');
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
});
