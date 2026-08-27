import test from 'node:test';
import * as assert from 'node:assert/strict';
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
