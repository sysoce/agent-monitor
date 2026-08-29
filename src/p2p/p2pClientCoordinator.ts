import { P2PPeerConnection, type P2PPeerConnectionOptions } from './p2pPeerConnection';
import { P2PSignaler } from './p2pSignaler';
import { P2PTransportAdapter } from './p2pTransportAdapter';
import type { P2PSignalMessage, P2PDataMessage } from './types';
import type { TransportStatus } from '../transport/types';

export interface P2PSignalTransport {
  postSignal(signal: P2PSignalMessage): Promise<boolean>;
  fetchSignals(): Promise<P2PSignalMessage[]>;
}

export interface P2PClientCoordinatorOptions {
  myPeerId?: string;
  createPeerConnection?: (config: any) => any;
  signalTransport: P2PSignalTransport;
  onConnected?: (adapter: P2PTransportAdapter) => void;
  onStatusChange?: (status: TransportStatus) => void;
  onDataMessage?: (msg: P2PDataMessage) => void;
}

export class P2PClientCoordinator {
  public readonly myPeerId: string;
  private peerConn: P2PPeerConnection | null = null;
  private signaler: P2PSignaler;
  private adapter: P2PTransportAdapter | null = null;
  private isRunning = false;
  private pollTimer?: NodeJS.Timeout;
  private processedSignalIds = new Set<string>();

  constructor(private readonly options: P2PClientCoordinatorOptions) {
    this.myPeerId = options.myPeerId || `client-${Math.random().toString(36).slice(2, 10)}`;
    this.signaler = new P2PSignaler(this.myPeerId);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.options.onStatusChange?.('connecting');

    const pcOpts: P2PPeerConnectionOptions = {
      peerId: this.myPeerId,
      createPeerConnection: this.options.createPeerConnection,
    };
    this.peerConn = new P2PPeerConnection(pcOpts);

    this.peerConn.onIceCandidate((candidate) => {
      const sig = this.signaler.createCandidateSignal(candidate);
      void this.options.signalTransport.postSignal(sig);
    });

    this.peerConn.onStateChange((state) => {
      if (state === 'connected') {
        this.setupAdapter();
      } else if (state === 'failed' || state === 'closed') {
        this.options.onStatusChange?.('disconnected');
      }
    });

    const offer = await this.peerConn.createOffer();
    const offerSig = this.signaler.createOfferSignal(offer);
    await this.options.signalTransport.postSignal(offerSig);

    const dataChannel = this.peerConn.getDataChannel();
    if (dataChannel) {
      dataChannel.onOpen(() => this.setupAdapter());
    }

    this.startSignalPolling();
  }

  private setupAdapter(): void {
    if (this.adapter || !this.peerConn) return;
    const dc = this.peerConn.getDataChannel();
    if (!dc) return;

    this.adapter = new P2PTransportAdapter({ dataChannel: dc });
    if (this.options.onDataMessage) {
      this.adapter.onMessage((msg) => this.options.onDataMessage?.(msg as P2PDataMessage));
    }
    this.adapter.onStatusChange((status) => this.options.onStatusChange?.(status));
    this.options.onStatusChange?.('connected');
    this.options.onConnected?.(this.adapter);
  }

  private startSignalPolling(): void {
    if (!this.isRunning || this.pollTimer) return;
    const poll = async () => {
      if (!this.isRunning) return;
      try {
        const signals = await this.options.signalTransport.fetchSignals();
        for (const sig of signals) {
          const sigId = `${sig.type}-${sig.senderId}-${sig.timestamp}`;
          if (this.processedSignalIds.has(sigId)) continue;
          if (this.signaler.isSignalForMe(sig)) {
            this.processedSignalIds.add(sigId);
            await this.handleSignal(sig);
          }
        }
      } catch {}
      if (this.isRunning && !this.isConnected()) {
        this.pollTimer = setTimeout(() => {
          this.pollTimer = undefined;
          void poll();
        }, 3000);
      }
    };
    void poll();
  }

  async handleSignal(signal: P2PSignalMessage): Promise<void> {
    if (!this.peerConn) return;
    await this.peerConn.handleSignal(signal);
  }

  isConnected(): boolean {
    return Boolean(this.adapter && this.adapter.getStatus() === 'connected');
  }

  getAdapter(): P2PTransportAdapter | null {
    return this.adapter;
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
    if (this.adapter) {
      this.adapter.disconnect();
      this.adapter = null;
    }
    if (this.peerConn) {
      this.peerConn.close();
      this.peerConn = null;
    }
    this.options.onStatusChange?.('disconnected');
  }
}
