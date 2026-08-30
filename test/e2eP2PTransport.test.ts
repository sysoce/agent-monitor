import test from 'node:test';
import * as assert from 'node:assert/strict';
import { P2PTransportAdapter } from '../src/p2p/p2pTransportAdapter';
import { P2PDataChannel } from '../src/p2p/p2pDataChannel';
import type { TransportMessage, TransportStatus } from '../src/transport/types';

class MockRawChannel {
  readyState = 'connecting';
  sent: string[] = [];
  onmessage: ((ev: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;

  send(data: string) { this.sent.push(data); }
  simulateOpen() { this.readyState = 'open'; this.onopen?.(); }
  simulateMessage(data: string) { this.onmessage?.({ data }); }
  simulateClose() { this.readyState = 'closed'; this.onclose?.(); }
}

test('E2E P2P: establishes data channel, tracks lifecycle, and handles bidirectional events', async () => {
  const raw = new MockRawChannel();
  const dataChannel = new P2PDataChannel(raw as any);
  const p2pAdapter = new P2PTransportAdapter({ dataChannel });
  const statuses: TransportStatus[] = [];
  p2pAdapter.onStatusChange((s) => statuses.push(s));

  assert.equal(p2pAdapter.getStatus(), 'disconnected');

  // Open data channel
  raw.simulateOpen();
  assert.equal(p2pAdapter.getStatus(), 'connected');

  // Receive server event over data channel
  const received: TransportMessage[] = [];
  p2pAdapter.onMessage((m) => received.push(m));
  raw.simulateMessage(JSON.stringify({
    id: 'evt-1',
    type: 'server_event',
    payload: { event: 'session_update', sessionId: 'sess-p2p' },
  }));

  assert.equal(received.length, 1);
  assert.equal(received[0].type, 'server_event');

  // Send message through P2P adapter
  const sent = await p2pAdapter.send({
    id: 'msg-p2p-1',
    sessionId: 'sess-p2p',
    type: 'user_input',
    payload: { content: 'P2P prompt execution' },
    timestamp: Date.now(),
  });

  assert.equal(sent, true);
  assert.equal(raw.sent.length, 1);
  const outMsg = JSON.parse(raw.sent[0]);
  assert.equal(outMsg.id, 'msg-p2p-1');
  assert.equal(outMsg.payload.content, 'P2P prompt execution');

  // Channel disconnect
  raw.simulateClose();
  assert.equal(p2pAdapter.getStatus(), 'disconnected');
});
