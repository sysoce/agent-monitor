import type { P2PSignalMessage, P2PSignalType } from './types';

export class P2PSignaler {
  constructor(public readonly myPeerId: string) {}

  createOfferSignal(offerPayload: any, recipientId?: string): P2PSignalMessage {
    return {
      type: 'offer',
      senderId: this.myPeerId,
      recipientId,
      payload: offerPayload,
      timestamp: Date.now(),
    };
  }

  createAnswerSignal(answerPayload: any, recipientId?: string): P2PSignalMessage {
    return {
      type: 'answer',
      senderId: this.myPeerId,
      recipientId,
      payload: answerPayload,
      timestamp: Date.now(),
    };
  }

  createCandidateSignal(candidatePayload: any, recipientId?: string): P2PSignalMessage {
    return {
      type: 'candidate',
      senderId: this.myPeerId,
      recipientId,
      payload: candidatePayload,
      timestamp: Date.now(),
    };
  }

  isSignalForMe(signal: P2PSignalMessage): boolean {
    if (!signal || signal.senderId === this.myPeerId) return false;
    return !signal.recipientId || signal.recipientId === this.myPeerId;
  }
}
