import type { TransportAdapter, TransportMessage, TransportStatus } from '../transport/types';
import { P2PDataChannel } from './p2pDataChannel';
import { P2PHeartbeat } from './p2pHeartbeat';
import type { P2PDataMessage } from './types';

export interface P2PTransportAdapterOptions {
  dataChannel: P2PDataChannel;
  heartbeatIntervalMs?: number;
}

export class P2PTransportAdapter implements TransportAdapter {
  public readonly mode = 'p2p';
  public readonly priority = 1;
  public readonly name = 'WebRTC Peer-to-Peer';

  private status: TransportStatus = 'disconnected';
  private readonly dataChannel: P2PDataChannel;
  private readonly heartbeat: P2PHeartbeat;
  private readonly messageListeners = new Set<(msg: TransportMessage) => void>();
  private readonly statusListeners = new Set<(status: TransportStatus) => void>();

  constructor(options: P2PTransportAdapterOptions) {
    this.dataChannel = options.dataChannel;
    this.heartbeat = new P2PHeartbeat({
      intervalMs: options.heartbeatIntervalMs || 5000,
      sendFn: (msg) => this.dataChannel.send(msg),
      onTimeout: () => {
        this.setStatus('reconnecting');
      },
    });

    this.bindDataChannelEvents();
  }

  private bindDataChannelEvents(): void {
    this.dataChannel.onOpen(() => {
      this.setStatus('connected');
    });

    this.dataChannel.onClose(() => {
      this.setStatus('disconnected');
    });

    this.dataChannel.onMessage((msg: P2PDataMessage) => {
      if (this.status !== 'connected' && this.dataChannel.isOpen()) {
        this.setStatus('connected');
      }
      if (this.heartbeat.handleIncomingMessage(msg)) {
        return;
      }
      for (const listener of this.messageListeners) {
        listener(msg);
      }
    });

    if (this.dataChannel.isOpen()) {
      this.setStatus('connected');
    }
  }

  getStatus(): TransportStatus {
    if (this.dataChannel.isOpen() && this.status !== 'connected') {
      this.setStatus('connected');
    }
    return this.status;
  }

  async connect(): Promise<boolean> {
    if (this.dataChannel.isOpen()) {
      this.setStatus('connected');
      return true;
    }
    this.setStatus('connecting');
    return false;
  }

  disconnect(): void {
    this.heartbeat.stop();
    this.setStatus('disconnected');
  }

  async send(message: TransportMessage): Promise<boolean> {
    const p2pMsg: P2PDataMessage = {
      id: message.id,
      type: message.type as any,
      sessionId: message.sessionId,
      payload: message.payload,
      timestamp: message.timestamp || Date.now(),
    };
    return this.dataChannel.send(p2pMsg);
  }

  onMessage(listener: (msg: TransportMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatusChange(listener: (status: TransportStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(s: TransportStatus): void {
    if (this.status === s) return;
    this.status = s;
    if (s === 'connected') {
      this.heartbeat.start();
    } else {
      this.heartbeat.stop();
    }
    for (const listener of this.statusListeners) {
      listener(s);
    }
  }
}
