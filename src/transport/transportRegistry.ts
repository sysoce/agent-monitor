import type { TransportAdapter, TransportStatus } from './types';

export class TransportRegistry {
  private readonly transports = new Map<string, TransportAdapter>();
  private readonly changeListeners = new Set<(active: TransportAdapter | null) => void>();

  register(adapter: TransportAdapter): void {
    this.transports.set(adapter.mode, adapter);
    adapter.onStatusChange(() => {
      this.notifyActiveChange();
    });
    this.notifyActiveChange();
  }

  unregister(mode: string): void {
    const existing = this.transports.get(mode);
    if (existing) {
      existing.disconnect();
      this.transports.delete(mode);
      this.notifyActiveChange();
    }
  }

  getTransport(mode: string): TransportAdapter | undefined {
    return this.transports.get(mode);
  }

  getAllTransports(): TransportAdapter[] {
    return Array.from(this.transports.values()).sort((a, b) => a.priority - b.priority);
  }

  getBestAvailableTransport(): TransportAdapter | null {
    const sorted = this.getAllTransports();
    for (const transport of sorted) {
      if (transport.getStatus() === 'connected') {
        return transport;
      }
    }
    return null;
  }

  onActiveTransportChange(listener: (active: TransportAdapter | null) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyActiveChange(): void {
    const active = this.getBestAvailableTransport();
    for (const listener of this.changeListeners) {
      listener(active);
    }
  }
}
