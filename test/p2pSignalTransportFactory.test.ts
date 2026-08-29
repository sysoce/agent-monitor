import test from 'node:test';
import * as assert from 'node:assert/strict';
import { createP2PSignalTransport } from '../src/p2p/p2pSignalTransportFactory';

test('createP2PSignalTransport returns LAN-based transport when baseUrl is supplied', () => {
  const transport = createP2PSignalTransport({ baseUrl: 'http://127.0.0.1:4200' });
  assert.ok(transport);
  assert.equal(typeof transport.postSignal, 'function');
  assert.equal(typeof transport.fetchSignals, 'function');
});

test('createP2PSignalTransport returns Gist-based transport when gistConfig is supplied', () => {
  const transport = createP2PSignalTransport({
    gistConfig: { token: 'test-token', gistId: 'test-gist' },
  });
  assert.ok(transport);
  assert.equal(typeof transport.postSignal, 'function');
  assert.equal(typeof transport.fetchSignals, 'function');
});
