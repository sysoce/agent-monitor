import test from 'node:test';
import * as assert from 'node:assert/strict';
import { SseTransportAdapter } from '../src/transport/sseTransportAdapter';

class MockEventSource {
  public onopen: (() => void) | null = null;
  public onmessage: ((ev: { data: string }) => void) | null = null;
  public onerror: (() => void) | null = null;
  public closed = false;
  private listeners: Record<string, Array<(ev: any) => void>> = {};

  constructor(public url: string) {}

  addEventListener(type: string, listener: (ev: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  emit(type: string, data: any) {
    if (type === 'message' && this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
    const list = this.listeners[type] || [];
    for (const fn of list) {
      fn({ data: JSON.stringify(data) });
    }
  }

  close() {
    this.closed = true;
  }
}

test('SseTransportAdapter connects to LAN IP endpoint with token query param and receives change events', async () => {
  let createdUrl = '';
  let mockEs: MockEventSource | null = null;

  const adapter = new SseTransportAdapter({
    baseUrl: 'http://192.168.1.150:4200',
    token: 'lan-secret-token',
    createEventSource: (url) => {
      createdUrl = url;
      mockEs = new MockEventSource(url);
      return mockEs;
    },
  });

  const statuses: string[] = [];
  adapter.onStatusChange((s) => statuses.push(s));

  const connectPromise = adapter.connect();
  assert.equal(createdUrl, 'http://192.168.1.150:4200/api/events?token=lan-secret-token');

  mockEs!.onopen?.();
  const ok = await connectPromise;
  assert.equal(ok, true);
  assert.equal(adapter.getStatus(), 'connected');

  const messages: any[] = [];
  adapter.onMessage((m) => messages.push(m));

  mockEs!.emit('change', { timestamp: 123456789 });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, 'change');
  assert.equal(messages[0].payload.timestamp, 123456789);

  adapter.disconnect();
  assert.equal(mockEs!.closed, true);
  assert.equal(adapter.getStatus(), 'disconnected');
});
