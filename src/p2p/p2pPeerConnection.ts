import { getDefaultIceServers, parseIceServers, type P2PIceServerConfig } from './p2pIceConfig';
import { P2PDataChannel } from './p2pDataChannel';
import type { P2PConnectionOptions, P2PConnectionState, P2PSignalMessage } from './types';

export interface P2PPeerConnectionOptions extends P2PConnectionOptions {
  createPeerConnection?: (config: any) => any;
}

export class P2PPeerConnection {
  private readonly pc: any;
  private dataChannel: P2PDataChannel | null = null;
  private state: P2PConnectionState = 'disconnected';
  private readonly stateListeners = new Set<(s: P2PConnectionState) => void>();
  private readonly candidateListeners = new Set<(c: any) => void>();

  constructor(private readonly options: P2PPeerConnectionOptions) {
    const iceServers = options.iceServers || getDefaultIceServers();
    const config = { iceServers };
    this.pc = options.createPeerConnection
      ? options.createPeerConnection(config)
      : typeof RTCPeerConnection !== 'undefined'
      ? new RTCPeerConnection(config)
      : null;

    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.pc) return;

    this.pc.onicecandidate = (ev: { candidate: any }) => {
      if (ev.candidate) {
        for (const listener of this.candidateListeners) {
          listener(ev.candidate);
        }
      }
    };

    this.pc.ondatachannel = (ev: { channel: any }) => {
      this.dataChannel = new P2PDataChannel(ev.channel);
      this.setState('connected');
    };

    if (this.pc.onconnectionstatechange !== undefined) {
      this.pc.onconnectionstatechange = () => {
        const rawState = this.pc.connectionState || this.pc.iceConnectionState;
        if (rawState === 'connected') this.setState('connected');
        else if (rawState === 'connecting') this.setState('connecting');
        else if (rawState === 'failed' || rawState === 'disconnected') this.setState('failed');
        else if (rawState === 'closed') this.setState('closed');
      };
    }
  }

  async createOffer(): Promise<any> {
    if (!this.pc) throw new Error('WebRTC not supported in this environment');
    this.setState('signaling');
    const rawChannel = this.pc.createDataChannel('agent-data', { ordered: true });
    this.dataChannel = new P2PDataChannel(rawChannel);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: any): Promise<any> {
    if (!this.pc) throw new Error('WebRTC not supported in this environment');
    this.setState('signaling');
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleSignal(signal: P2PSignalMessage): Promise<void> {
    if (!this.pc) return;
    if (signal.type === 'answer') {
      await this.pc.setRemoteDescription(signal.payload);
      this.setState('connecting');
    } else if (signal.type === 'candidate' && signal.payload) {
      try {
        await this.pc.addIceCandidate(signal.payload);
      } catch {}
    }
  }

  onIceCandidate(listener: (candidate: any) => void): () => void {
    this.candidateListeners.add(listener);
    return () => this.candidateListeners.delete(listener);
  }

  onStateChange(listener: (s: P2PConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  getDataChannel(): P2PDataChannel | null {
    return this.dataChannel;
  }

  getState(): P2PConnectionState {
    return this.state;
  }

  close(): void {
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
    }
    this.setState('closed');
  }

  private setState(s: P2PConnectionState): void {
    if (this.state === s) return;
    this.state = s;
    for (const listener of this.stateListeners) {
      listener(s);
    }
  }
}
