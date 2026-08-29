import test from 'node:test';
import * as assert from 'node:assert/strict';
import { isStaticHostEnvironment, initSseClient } from '../src/ui/sseClient';

test('isStaticHostEnvironment detects github.io and file: protocols', () => {
  const originalWindow = (global as any).window;

  (global as any).window = {
    location: { hostname: 'sysoce.github.io', protocol: 'https:' },
  };
  assert.equal(isStaticHostEnvironment(), true);

  (global as any).window = {
    location: { hostname: 'my-app.pages.dev', protocol: 'https:' },
  };
  assert.equal(isStaticHostEnvironment(), true);

  (global as any).window = {
    location: { hostname: '', protocol: 'file:' },
  };
  assert.equal(isStaticHostEnvironment(), true);

  (global as any).window = {
    location: { hostname: '192.168.1.50', protocol: 'http:' },
  };
  assert.equal(isStaticHostEnvironment(), false);

  (global as any).window = {
    location: { hostname: 'localhost', protocol: 'http:' },
  };
  assert.equal(isStaticHostEnvironment(), false);

  (global as any).localStorage = {
    getItem: (k: string) => (k === 'agent_server_url' ? 'http://192.168.1.50:4200' : null),
  };
  (global as any).window = {
    location: { hostname: 'sysoce.github.io', protocol: 'https:' },
  };
  assert.equal(isStaticHostEnvironment(), false);

  delete (global as any).localStorage;
  (global as any).window = originalWindow;
});

test('initSseClient immediately sets disconnected status without opening EventSource on github.io', async () => {
  const originalWindow = (global as any).window;
  (global as any).window = {
    location: { hostname: 'sysoce.github.io', protocol: 'https:' },
  };

  const statuses: string[] = [];
  const cleanup = initSseClient({
    onStatusChange: (status) => {
      statuses.push(status);
    },
    onChange: () => {},
  });

  await new Promise((r) => setTimeout(r, 20));
  cleanup();

  assert.deepEqual(statuses, ['disconnected']);

  (global as any).window = originalWindow;
});
