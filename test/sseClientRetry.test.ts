import test from 'node:test';
import * as assert from 'node:assert/strict';
import { initSseClient } from '../src/ui/sseClient';

class MockEventSource {
  static instances: MockEventSource[] = [];
  public onopen: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public listeners: Record<string, Function[]> = {};
  public closed = false;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, fn: Function): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]?.push(fn);
  }

  close(): void {
    this.closed = true;
  }
}

test('initSseClient transitions through syncing, connecting on first error, and connected on open', async () => {
  const originalWindow = (global as any).window;
  const originalEventSource = (global as any).EventSource;

  MockEventSource.instances = [];
  (global as any).window = {
    location: { hostname: '192.168.1.111', protocol: 'http:' },
  };
  (global as any).EventSource = MockEventSource;

  const statuses: string[] = [];
  const cleanup = initSseClient({
    onStatusChange: (status) => statuses.push(status),
    onChange: () => {},
  });

  assert.equal(statuses[0], 'syncing');
  assert.equal(MockEventSource.instances.length, 1);

  // Trigger first error
  const firstEs = MockEventSource.instances[0]!;
  firstEs.onerror?.();
  assert.equal(statuses[1], 'connecting', 'First error should transition to connecting');

  // Trigger second error
  firstEs.onerror?.();
  assert.equal(statuses[2], 'connecting', 'Second error should transition to connecting');

  // Trigger third error
  firstEs.onerror?.();
  assert.equal(statuses[3], 'disconnected', 'Third error should transition to disconnected');

  // Now trigger open on a new connection
  firstEs.onopen?.();
  assert.equal(statuses[4], 'connected', 'Open event should transition to connected');

  cleanup();
  (global as any).window = originalWindow;
  (global as any).EventSource = originalEventSource;
});
