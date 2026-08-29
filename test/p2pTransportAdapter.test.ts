import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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

  send(data: string) {
    this.sent.push(data);
  }

  simulateOpen() {
    this.readyState = 'open';
    this.onopen?.();
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  simulateClose() {
    this.readyState = 'closed';
    this.onclose?.();
  }
}

describe('P2PTransportAdapter', () => {
  it('has mode p2p with highest priority 1', () => {
    const raw = new MockRawChannel();
    const dataChannel = new P2PDataChannel(raw as any);
    const adapter = new P2PTransportAdapter({ dataChannel });

    assert.equal(adapter.mode, 'p2p');
    assert.equal(adapter.priority, 1);
    assert.equal(adapter.getStatus(), 'disconnected');
  });

  it('updates status to connected on channel open and emits status change', () => {
    const raw = new MockRawChannel();
    const dataChannel = new P2PDataChannel(raw as any);
    const adapter = new P2PTransportAdapter({ dataChannel });

    const statuses: TransportStatus[] = [];
    adapter.onStatusChange((s: TransportStatus) => statuses.push(s));

    raw.simulateOpen();

    assert.equal(adapter.getStatus(), 'connected');
    assert.ok(statuses.includes('connected'));
  });

  it('queues messages before open and delivers upon connection', () => {
    const raw = new MockRawChannel();
    const dataChannel = new P2PDataChannel(raw as any);
    const adapter = new P2PTransportAdapter({ dataChannel });

    adapter.send({
      id: 'msg-1',
      type: 'user_input',
      payload: { text: 'Hello' },
      timestamp: Date.now(),
    });

    assert.equal(raw.sent.length, 0);

    raw.simulateOpen();

    assert.equal(raw.sent.length, 1);
    const parsed = JSON.parse(raw.sent[0]);
    assert.equal(parsed.id, 'msg-1');
    assert.equal(parsed.type, 'user_input');
  });

  it('dispatches incoming messages to listeners', () => {
    const raw = new MockRawChannel();
    const dataChannel = new P2PDataChannel(raw as any);
    const adapter = new P2PTransportAdapter({ dataChannel });

    const received: TransportMessage[] = [];
    adapter.onMessage((m: TransportMessage) => received.push(m));

    raw.simulateOpen();
    raw.simulateMessage(
      JSON.stringify({
        id: 'delta-1',
        type: 'stream_delta',
        payload: { textDelta: 'Hi' },
        timestamp: Date.now(),
      })
    );

    assert.equal(received.length, 1);
    assert.equal(received[0].id, 'delta-1');
    assert.equal(received[0].payload.textDelta, 'Hi');
  });
});
