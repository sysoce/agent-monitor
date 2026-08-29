import test from 'node:test';
import * as assert from 'node:assert/strict';
import { getServerBaseUrl, setServerBaseUrl, clearServerBaseUrl, getDefaultServerUrl } from '../src/ui/authStore';

test('getDefaultServerUrl returns empty string or configured define', () => {
  const def = getDefaultServerUrl();
  assert.equal(typeof def, 'string');
});

test('getServerBaseUrl returns default LAN IP when localStorage is empty', () => {
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;
  const store: Record<string, string> = {};

  (globalThis as any).window = {
    location: { protocol: 'https:', hostname: 'sysoce.github.io', search: '' },
  };
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
  };

  (globalThis as any).__DEFAULT_SERVER_URL__ = 'http://192.168.1.111:4200';

  assert.equal(getServerBaseUrl(), 'http://192.168.1.111:4200');

  // Explicit 'none' stored should return empty string
  clearServerBaseUrl();
  assert.equal(getServerBaseUrl(), '');

  // Setting explicit IP should return explicit IP
  setServerBaseUrl('http://10.0.0.99:4200');
  assert.equal(getServerBaseUrl(), 'http://10.0.0.99:4200');

  delete (globalThis as any).__DEFAULT_SERVER_URL__;
  (globalThis as any).window = originalWindow;
  (globalThis as any).localStorage = originalLocalStorage;
});
