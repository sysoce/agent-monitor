export type P2PSignalType = 'offer' | 'answer' | 'candidate' | 'ping' | 'pong' | 'ready';

export interface P2PSignalMessage {
  type: P2PSignalType;
  senderId: string;
  recipientId?: string;
  payload: any;
  timestamp: number;
}

export type P2PConnectionState =
  | 'disconnected'
  | 'signaling'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'closed';

export interface P2PDataMessage {
  id: string;
  type: 'stream_delta' | 'session_update' | 'user_input' | 'approval_response' | 'abort' | 'ping' | 'pong';
  sessionId?: string;
  payload: any;
  timestamp: number;
}

export interface P2PConnectionOptions {
  peerId: string;
  iceServers?: { urls: string; username?: string; credential?: string }[];
  isInitiator?: boolean;
  signalingTimeoutMs?: number;
}
