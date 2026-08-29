import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { P2PSignaler } from '../src/p2p/p2pSignaler';
import type { P2PSignalMessage } from '../src/p2p/types';

describe('P2PSignaler', () => {
  it('creates and parses SDP offer signal messages with metadata', () => {
    const signaler = new P2PSignaler('host-desktop-1');
    const offerSdp = { type: 'offer' as const, sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\n' };
    
    const signal = signaler.createOfferSignal(offerSdp, 'mobile-client-1');
    assert.equal(signal.type, 'offer');
    assert.equal(signal.senderId, 'host-desktop-1');
    assert.equal(signal.recipientId, 'mobile-client-1');
    assert.deepEqual(signal.payload, offerSdp);
    assert.ok(signal.timestamp > 0);
  });

  it('filters incoming signals targeted for this peer', () => {
    const signaler = new P2PSignaler('mobile-client-1');
    const signalForMe: P2PSignalMessage = {
      type: 'offer',
      senderId: 'host-desktop-1',
      recipientId: 'mobile-client-1',
      payload: { type: 'offer', sdp: 'mock-sdp' },
      timestamp: Date.now(),
    };
    const signalForOther: P2PSignalMessage = {
      type: 'offer',
      senderId: 'host-desktop-1',
      recipientId: 'another-client',
      payload: { type: 'offer', sdp: 'mock-sdp' },
      timestamp: Date.now(),
    };

    assert.equal(signaler.isSignalForMe(signalForMe), true);
    assert.equal(signaler.isSignalForMe(signalForOther), false);
  });

  it('creates answer and ICE candidate signals', () => {
    const signaler = new P2PSignaler('mobile-client-1');
    const answerSdp = { type: 'answer' as const, sdp: 'v=0\r\no=- 67890 2 IN IP4 127.0.0.1\r\n' };
    const answerSignal = signaler.createAnswerSignal(answerSdp, 'host-desktop-1');
    assert.equal(answerSignal.type, 'answer');
    assert.deepEqual(answerSignal.payload, answerSdp);

    const candidate = { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.50 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 };
    const candSignal = signaler.createCandidateSignal(candidate, 'host-desktop-1');
    assert.equal(candSignal.type, 'candidate');
    assert.deepEqual(candSignal.payload, candidate);
  });
});
