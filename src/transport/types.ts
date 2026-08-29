export type TransportStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed'
  | 'offline';

export interface TransportMessage {
  id: string;
  type: string;
  sessionId?: string;
  payload: any;
  timestamp: number;
}

export interface TransportAdapter {
  readonly mode: string;
  readonly priority: number;
  readonly name: string;
  getStatus(): TransportStatus;
  connect(): Promise<boolean>;
  disconnect(): void;
  send(message: TransportMessage): Promise<boolean>;
  onMessage(listener: (msg: TransportMessage) => void): () => void;
  onStatusChange(listener: (status: TransportStatus) => void): () => void;
}
