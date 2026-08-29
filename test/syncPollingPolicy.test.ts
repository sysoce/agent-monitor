import test from 'node:test';
import * as assert from 'node:assert/strict';
import {
  computeHostPollInterval,
  computeClientPollInterval,
} from '../src/sync/syncPollingPolicy';

test('computeHostPollInterval returns fast interval when session is generating', () => {
  const interval = computeHostPollInterval({
    isGenerating: true,
    lastActivityAt: Date.now() - 300_000,
    remainingQuota: 4500,
  });
  assert.equal(interval, 8000);
});

test('computeHostPollInterval returns fast interval when recent inbox activity occurred < 60s ago', () => {
  const interval = computeHostPollInterval({
    isGenerating: false,
    lastActivityAt: Date.now() - 20_000,
    remainingQuota: 4500,
  });
  assert.equal(interval, 8000);
});

test('computeHostPollInterval steps down to moderate interval when idle for 60s-180s', () => {
  const interval = computeHostPollInterval({
    isGenerating: false,
    lastActivityAt: Date.now() - 90_000,
    remainingQuota: 4500,
  });
  assert.equal(interval, 20000);
});

test('computeHostPollInterval steps down to deep idle interval (60s) when idle for > 180s', () => {
  const interval = computeHostPollInterval({
    isGenerating: false,
    lastActivityAt: Date.now() - 300_000,
    remainingQuota: 4500,
  });
  assert.equal(interval, 60000);
});

test('computeHostPollInterval throttles to >= 60s when remaining quota is low (< 100)', () => {
  const interval = computeHostPollInterval({
    isGenerating: true,
    lastActivityAt: Date.now(),
    remainingQuota: 80,
  });
  assert.equal(interval, 60000);
});

test('computeHostPollInterval throttles to >= 120s when remaining quota is critically low (< 30)', () => {
  const interval = computeHostPollInterval({
    isGenerating: true,
    lastActivityAt: Date.now(),
    remainingQuota: 15,
  });
  assert.equal(interval, 120000);
});

test('computeClientPollInterval returns fast interval (6s) when awaiting response < 90s', () => {
  const interval = computeClientPollInterval({
    isAwaitingResponse: true,
    awaitingStartedAt: Date.now() - 10_000,
    isHidden: false,
    remainingQuota: 4000,
  });
  assert.equal(interval, 6000);
});

test('computeClientPollInterval steps down to 15s when awaiting response has exceeded 90s', () => {
  const interval = computeClientPollInterval({
    isAwaitingResponse: true,
    awaitingStartedAt: Date.now() - 100_000,
    isHidden: false,
    remainingQuota: 4000,
  });
  assert.equal(interval, 15000);
});

test('computeClientPollInterval returns foreground idle interval (15s) when not awaiting', () => {
  const interval = computeClientPollInterval({
    isAwaitingResponse: false,
    isHidden: false,
    remainingQuota: 4000,
  });
  assert.equal(interval, 15000);
});

test('computeClientPollInterval returns background interval (45s) when tab is hidden', () => {
  const interval = computeClientPollInterval({
    isAwaitingResponse: false,
    isHidden: true,
    remainingQuota: 4000,
  });
  assert.equal(interval, 45000);
});

test('computeClientPollInterval throttles to >= 45s when quota is low (< 50)', () => {
  const interval = computeClientPollInterval({
    isAwaitingResponse: true,
    awaitingStartedAt: Date.now() - 5_000,
    isHidden: false,
    remainingQuota: 40,
  });
  assert.equal(interval, 45000);
});
