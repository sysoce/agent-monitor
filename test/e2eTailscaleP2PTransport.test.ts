import test from 'node:test';
import * as assert from 'node:assert/strict';
import { createP2PSignalTransport } from '../src/p2p/p2pSignalTransportFactory';
import { P2PDataChannel } from '../src/p2p/p2pDataChannel';
import { P2PTransportAdapter } from '../src/p2p/p2pTransportAdapter';
import type { TransportMessage } from '../src/transport/types';

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

test('E2E Tailscale+P2P: creates signaling transport pointing to Tailscale endpoint', async () => {
  const tsEndpoint = 'http://100.115.92.1:4200';
  const signalTransport = createP2PSignalTransport({ baseUrl: tsEndpoint });

  let postedUrl = '';
  let postedSignal: any = null;
  const customFetch = (async (url: string, opts?: RequestInit) => {
    postedUrl = url;
    postedSignal = JSON.parse(opts?.body as string);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as unknown as typeof fetch;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = customFetch;
  try {
    const ok = await signalTransport.postSignal({
      type: 'offer',
      senderId: 'client',
      payload: { sdp: 'v=0...tailscale-offer' },
      timestamp: Date.now(),
    });
    assert.equal(ok, true);
    assert.equal(postedUrl, 'http://100.115.92.1:4200/api/p2p/signal');
    assert.equal(postedSignal.type, 'offer');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('E2E Tailscale+P2P: sends and receives messages over established P2P data channel', async () => {
  const raw = new MockRawChannel();
  const dataChannel = new P2PDataChannel(raw as any);
  const p2pAdapter = new P2PTransportAdapter({ dataChannel });
  raw.simulateOpen();

  assert.equal(p2pAdapter.getStatus(), 'connected');

  const received: TransportMessage[] = [];
  p2pAdapter.onMessage((m) => received.push(m));

  // Receive stream chunk over Tailscale P2P
  raw.simulateMessage(JSON.stringify({
    id: 'msg-ts-in',
    type: 'server_event',
    payload: { event: 'plan_update', plan: 'Plan content' },
  }));

  assert.equal(received.length, 1);
  assert.equal(received[0].id, 'msg-ts-in');

  // Send message over Tailscale P2P
  const ok = await p2pAdapter.send({
    id: 'msg-ts-out',
    sessionId: 'sess-p2p-ts',
    type: 'client_message',
    payload: { content: 'P2P over Tailscale message', mode: 'plan' },
    timestamp: Date.now(),
  });

  assert.equal(ok, true);
  assert.equal(raw.sent.length, 1);
  const parsed = JSON.parse(raw.sent[0]);
  assert.equal(parsed.id, 'msg-ts-out');
  assert.equal(parsed.payload.content, 'P2P over Tailscale message');
});
