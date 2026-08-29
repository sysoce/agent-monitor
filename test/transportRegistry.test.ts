import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TransportRegistry } from '../src/transport/transportRegistry';
import type { TransportAdapter, TransportStatus, TransportMessage } from '../src/transport/types';

class MockTransport implements TransportAdapter {
  private status: TransportStatus = 'disconnected';
  private statusListeners = new Set<(s: TransportStatus) => void>();
  private messageListeners = new Set<(m: TransportMessage) => void>();
  public sentMessages: TransportMessage[] = [];

  constructor(
    public readonly mode: string,
    public readonly priority: number,
    public readonly name: string = mode
  ) {}

  getStatus(): TransportStatus {
    return this.status;
  }

  setStatus(s: TransportStatus): void {
    this.status = s;
    for (const l of this.statusListeners) l(s);
  }

  async connect(): Promise<boolean> {
    this.setStatus('connected');
    return true;
  }

  disconnect(): void {
    this.setStatus('disconnected');
  }

  async send(msg: TransportMessage): Promise<boolean> {
    this.sentMessages.push(msg);
    return true;
  }

  onMessage(listener: (msg: TransportMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatusChange(listener: (status: TransportStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }
}

describe('TransportRegistry', () => {
  it('registers and retrieves transports sorted by priority', () => {
    const registry = new TransportRegistry();
    const gist = new MockTransport('git-backup', 3);
    const p2p = new MockTransport('p2p', 1);
    const sse = new MockTransport('live-sse', 2);

    registry.register(gist);
    registry.register(p2p);
    registry.register(sse);

    const all = registry.getAllTransports();
    assert.equal(all.length, 3);
    assert.equal(all[0].mode, 'p2p');
    assert.equal(all[1].mode, 'live-sse');
    assert.equal(all[2].mode, 'git-backup');
  });

  it('selects the highest priority connected transport', () => {
    const registry = new TransportRegistry();
    const gist = new MockTransport('git-backup', 3);
    const p2p = new MockTransport('p2p', 1);
    const sse = new MockTransport('live-sse', 2);

    registry.register(gist);
    registry.register(p2p);
    registry.register(sse);

    gist.setStatus('connected');
    sse.setStatus('connected');
    p2p.setStatus('disconnected');

    const active = registry.getBestAvailableTransport();
    assert.equal(active?.mode, 'live-sse');

    p2p.setStatus('connected');
    const best = registry.getBestAvailableTransport();
    assert.equal(best?.mode, 'p2p');
  });

  it('allows dynamic registration of new custom transport plugins', () => {
    const registry = new TransportRegistry();
    const custom = new MockTransport('tailscale-mesh', 0); // highest priority
    registry.register(custom);
    custom.setStatus('connected');

    const best = registry.getBestAvailableTransport();
    assert.equal(best?.mode, 'tailscale-mesh');
  });
});
