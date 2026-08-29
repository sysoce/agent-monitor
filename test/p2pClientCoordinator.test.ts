import test from 'node:test';
import * as assert from 'node:assert/strict';
import { P2PClientCoordinator } from '../src/p2p/p2pClientCoordinator';

class FakeDataChannel {
  public readyState = 'open';
  public sent: string[] = [];
  public onmessage: ((ev: { data: string }) => void) | null = null;
  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: ((err: any) => void) | null = null;

  send(data: string): void {
    this.sent.push(data);
  }
}

class FakePeerConnection {
  public onicecandidate: ((ev: { candidate: any }) => void) | null = null;
  public ondatachannel: ((ev: { channel: any }) => void) | null = null;
  public onconnectionstatechange: (() => void) | null = null;
  public connectionState = 'new';
  public localDesc: any = null;
  public remoteDesc: any = null;
  public addedCandidates: any[] = [];
  public channel: FakeDataChannel = new FakeDataChannel();

  createDataChannel(_label: string) {
    return this.channel;
  }

  async createOffer() {
    return { type: 'offer', sdp: 'fake-offer-sdp' };
  }

  async setLocalDescription(desc: any) {
    this.localDesc = desc;
  }

  async setRemoteDescription(desc: any) {
    this.remoteDesc = desc;
  }

  async addIceCandidate(candidate: any) {
    this.addedCandidates.push(candidate);
  }

  close() {
    this.connectionState = 'closed';
  }
}

test('P2PClientCoordinator creates offer and establishes connected adapter', async () => {
  let createdFakePc: FakePeerConnection | null = null;
  const signalsSent: any[] = [];
  let connectedAdapter: any = null;

  const coordinator = new P2PClientCoordinator({
    myPeerId: 'mobile-client-1',
    createPeerConnection: () => {
      const pc = new FakePeerConnection();
      createdFakePc = pc;
      return pc;
    },
    signalTransport: {
      postSignal: async (signal) => {
        signalsSent.push(signal);
        return true;
      },
      fetchSignals: async () => [],
    },
    onConnected: (adapter) => {
      connectedAdapter = adapter;
    },
  });

  await coordinator.start();

  assert.ok(createdFakePc);
  const pc = createdFakePc as FakePeerConnection;
  assert.equal(signalsSent.length, 1);
  assert.equal(signalsSent[0].type, 'offer');
  assert.equal(signalsSent[0].senderId, 'mobile-client-1');

  // Simulate receiving answer signal
  await coordinator.handleSignal({
    type: 'answer',
    senderId: 'host-1',
    payload: { type: 'answer', sdp: 'fake-answer-sdp' },
    timestamp: Date.now(),
  });

  assert.ok(pc.remoteDesc);
  assert.equal(pc.remoteDesc.sdp, 'fake-answer-sdp');

  // Trigger data channel open
  pc.channel.onopen?.();

  assert.ok(coordinator.isConnected());
  assert.ok(connectedAdapter);

  coordinator.stop();
  assert.equal(coordinator.isConnected(), false);
});
