import test from 'node:test';
import * as assert from 'node:assert/strict';
import { LiveReachabilityProbe } from '../src/ui/liveReachabilityProbe';

test('LiveReachabilityProbe checkReachability triggers onReachable when endpoint responds ok', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;

  (globalThis as any).window = {
    location: { protocol: 'https:', hostname: 'sysoce.github.io', search: '' },
  };
  (globalThis as any).localStorage = {
    getItem: (key: string) => (key === 'agent_server_url' ? 'http://192.168.1.111:4200' : null),
  };

  let probedUrl = '';
  globalThis.fetch = (async (url: string) => {
    probedUrl = url;
    return { ok: true, status: 200 } as any;
  }) as any;

  let reached = false;
  const probe = new LiveReachabilityProbe({
    onReachable: () => { reached = true; },
    intervalMs: 1000,
  });

  const res = await probe.checkReachability();
  assert.equal(res, true);
  assert.equal(reached, true);
  assert.ok(probedUrl.includes('http://192.168.1.111:4200'));

  probe.stop();
  globalThis.fetch = originalFetch;
  (globalThis as any).window = originalWindow;
  (globalThis as any).localStorage = originalLocalStorage;
});

test('LiveReachabilityProbe checkReachability returns false when fetch fails', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;

  (globalThis as any).window = {
    location: { protocol: 'https:', hostname: 'sysoce.github.io', search: '' },
  };
  (globalThis as any).localStorage = {
    getItem: (key: string) => (key === 'agent_server_url' ? 'http://192.168.1.111:4200' : null),
  };

  globalThis.fetch = (async () => {
    throw new Error('Network timeout');
  }) as any;

  let reached = false;
  const probe = new LiveReachabilityProbe({
    onReachable: () => { reached = true; },
  });

  const res = await probe.checkReachability();
  assert.equal(res, false);
  assert.equal(reached, false);

  probe.stop();
  globalThis.fetch = originalFetch;
  (globalThis as any).window = originalWindow;
  (globalThis as any).localStorage = originalLocalStorage;
});
