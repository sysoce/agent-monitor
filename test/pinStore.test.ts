import test from 'node:test';
import * as assert from 'node:assert/strict';
import { getPinnedSessionIds, togglePinnedSession, isSessionPinned, setPinnedSessionIds } from '../src/ui/pinStore';

test('pinStore loads empty array when localStorage is unset', () => {
  const original = (globalThis as any).localStorage;
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  try {
    assert.deepEqual(getPinnedSessionIds(), []);
    assert.equal(isSessionPinned('sess_1'), false);
  } finally {
    (globalThis as any).localStorage = original;
  }
});

test('pinStore toggles session pin status and persists to localStorage', () => {
  const original = (globalThis as any).localStorage;
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  try {
    const pinned = togglePinnedSession('sess_1');
    assert.equal(pinned, true);
    assert.equal(isSessionPinned('sess_1'), true);
    assert.deepEqual(getPinnedSessionIds(), ['sess_1']);

    const unpinned = togglePinnedSession('sess_1');
    assert.equal(unpinned, false);
    assert.equal(isSessionPinned('sess_1'), false);
    assert.deepEqual(getPinnedSessionIds(), []);
  } finally {
    (globalThis as any).localStorage = original;
  }
});
