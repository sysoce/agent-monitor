import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { P2PSignalStore, handleP2PSignalRoute } from '../src/server/p2pSignalRouter';
import type { IncomingMessage, ServerResponse } from 'node:http';

describe('P2PSignalStore', () => {
  it('stores and consumes signals for a recipient', () => {
    const store = new P2PSignalStore();
    store.push({
      type: 'offer',
      senderId: 'host-1',
      recipientId: 'client-1',
      payload: { sdp: 'offer-sdp' },
      timestamp: Date.now(),
    });

    assert.equal(store.getSignals('other-client').length, 0);

    const forClient = store.getSignals('client-1');
    assert.equal(forClient.length, 1);
    assert.equal(forClient[0].senderId, 'host-1');
    assert.equal(forClient[0].type, 'offer');

    // Consumed signals are removed
    assert.equal(store.getSignals('client-1').length, 0);
  });

  it('prunes expired signals older than ttlMs', () => {
    const store = new P2PSignalStore();
    store.push({
      type: 'candidate',
      senderId: 'host-1',
      recipientId: 'client-1',
      payload: { candidate: 'c1' },
      timestamp: Date.now() - 70000,
    });

    store.pruneExpired(60000);
    assert.equal(store.getSignals('client-1').length, 0);
  });
});
