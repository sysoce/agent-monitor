import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { P2PPeerConnection } from '../src/p2p/p2pPeerConnection';

class MockRTCPeerConnection {
  iceConnectionState = 'new';
  connectionState = 'new';
  localDescription: any = null;
  remoteDescription: any = null;
  onicecandidate: ((ev: { candidate: any }) => void) | null = null;
  ondatachannel: ((ev: { channel: any }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;

  async createOffer() {
    return { type: 'offer', sdp: 'mock-offer-sdp' };
  }

  async createAnswer() {
    return { type: 'answer', sdp: 'mock-answer-sdp' };
  }

  async setLocalDescription(desc: any) {
    this.localDescription = desc;
  }

  async setRemoteDescription(desc: any) {
    this.remoteDescription = desc;
  }

  async addIceCandidate(_candidate: any) {}

  createDataChannel(label: string) {
    return {
      label,
      readyState: 'connecting',
      send: () => {},
      onmessage: null,
      onopen: null,
      onclose: null,
      onerror: null,
    };
  }

  close() {
    this.connectionState = 'closed';
    this.iceConnectionState = 'closed';
  }
}

describe('P2PPeerConnection', () => {
  it('creates data channel on initiator offer creation', async () => {
    const mockPeer = new MockRTCPeerConnection();
    const pc = new P2PPeerConnection({
      peerId: 'host-1',
      isInitiator: true,
      createPeerConnection: () => mockPeer as any,
    });

    const offer = await pc.createOffer();
    assert.equal(offer.type, 'offer');
    assert.equal(offer.sdp, 'mock-offer-sdp');
    assert.ok(pc.getDataChannel());
  });

  it('handles remote answer signal and updates description', async () => {
    const mockPeer = new MockRTCPeerConnection();
    const pc = new P2PPeerConnection({
      peerId: 'host-1',
      isInitiator: true,
      createPeerConnection: () => mockPeer as any,
    });

    await pc.createOffer();
    await pc.handleSignal({
      type: 'answer',
      senderId: 'client-1',
      recipientId: 'host-1',
      payload: { sdp: 'mock-answer-sdp', type: 'answer' },
      timestamp: Date.now(),
    });

    assert.equal(mockPeer.remoteDescription?.sdp, 'mock-answer-sdp');
  });

  it('handles remote answer signal and generates answer on receiver', async () => {
    const mockPeer = new MockRTCPeerConnection();
    const pc = new P2PPeerConnection({
      peerId: 'client-1',
      isInitiator: false,
      createPeerConnection: () => mockPeer as any,
    });

    const answer = await pc.handleOffer({
      type: 'offer',
      sdp: 'incoming-offer-sdp',
    });

    assert.equal(answer.type, 'answer');
    assert.equal(answer.sdp, 'mock-answer-sdp');
  });
});
