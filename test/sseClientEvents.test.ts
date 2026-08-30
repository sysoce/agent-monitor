import test from 'node:test';
import * as assert from 'node:assert/strict';
import { initSseClient } from '../src/ui/sseClient';

class MockEventSourceExtended {
  static instances: MockEventSourceExtended[] = [];
  public onopen: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public onmessage: ((ev: any) => void) | null = null;
  public listeners: Record<string, Function[]> = {};
  public closed = false;

  constructor(public url: string) {
    MockEventSourceExtended.instances.push(this);
  }

  addEventListener(event: string, fn: Function): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]?.push(fn);
  }

  emit(event: string, data: any = {}): void {
    if (event === 'message' && this.onmessage) {
      this.onmessage(data);
    }
    const handlers = this.listeners[event] || [];
    for (const h of handlers) {
      h(data);
    }
  }

  close(): void {
    this.closed = true;
  }
}

test('initSseClient triggers onChange for message, change, update, and session events', async () => {
  const originalWindow = (global as any).window;
  const originalEventSource = (global as any).EventSource;

  MockEventSourceExtended.instances = [];
  (global as any).window = {
    location: { hostname: '192.168.1.111', protocol: 'http:' },
  };
  (global as any).EventSource = MockEventSourceExtended;

  let changeCount = 0;
  const cleanup = initSseClient({
    onStatusChange: () => {},
    onChange: () => { changeCount++; },
  });

  assert.equal(MockEventSourceExtended.instances.length, 1);
  const es = MockEventSourceExtended.instances[0]!;

  es.emit('message', { data: JSON.stringify({ type: 'sync' }) });
  assert.equal(changeCount, 1, 'Standard message event should trigger onChange');

  es.emit('change', { data: JSON.stringify({ type: 'change' }) });
  assert.equal(changeCount, 2, 'Change event should trigger onChange');

  es.emit('update', { data: JSON.stringify({ type: 'update' }) });
  assert.equal(changeCount, 3, 'Update event should trigger onChange');

  es.emit('session', { data: JSON.stringify({ type: 'session' }) });
  assert.equal(changeCount, 4, 'Session event should trigger onChange');

  cleanup();
  (global as any).window = originalWindow;
  (global as any).EventSource = originalEventSource;
});

test('initSseClient immediately sets disconnected when url is mixed content blocked on HTTPS', async () => {
  const originalWindow = (global as any).window;
  const originalEventSource = (global as any).EventSource;
  const originalLocalStorage = (global as any).localStorage;

  MockEventSourceExtended.instances = [];
  (global as any).window = {
    location: { hostname: 'sysoce.github.io', protocol: 'https:' },
  };
  (global as any).localStorage = {
    getItem: (k: string) => (k === 'agent_server_url' ? 'http://192.168.1.111:4200' : null),
  };
  (global as any).EventSource = MockEventSourceExtended;

  const statuses: string[] = [];
  const cleanup = initSseClient({
    onStatusChange: (status) => statuses.push(status),
    onChange: () => {},
  });

  await new Promise((r) => setTimeout(r, 20));
  cleanup();

  assert.equal(MockEventSourceExtended.instances.length, 0, 'No EventSource should be created for mixed content');
  assert.deepEqual(statuses, ['disconnected']);

  (global as any).window = originalWindow;
  (global as any).EventSource = originalEventSource;
  (global as any).localStorage = originalLocalStorage;
});
