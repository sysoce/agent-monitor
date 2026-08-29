import type { P2PDataMessage } from './types';

export interface P2PHeartbeatOptions {
  intervalMs?: number;
  maxMissed?: number;
  sendFn: (msg: P2PDataMessage) => boolean;
  onTimeout?: () => void;
}

export class P2PHeartbeat {
  private readonly intervalMs: number;
  private readonly maxMissed: number;
  private readonly sendFn: (msg: P2PDataMessage) => boolean;
  private readonly onTimeout?: () => void;

  private timer: NodeJS.Timeout | null = null;
  private missedCount = 0;
  private latencyMs = 0;
  private lastPingSentAt = 0;
  private lastPingId = '';

  constructor(options: P2PHeartbeatOptions) {
    this.intervalMs = options.intervalMs || 5000;
    this.maxMissed = options.maxMissed || 3;
    this.sendFn = options.sendFn;
    this.onTimeout = options.onTimeout;
  }

  start(): void {
    this.stop();
    this.missedCount = 0;
    this.timer = setInterval(() => {
      this.sendPing();
    }, this.intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  sendPing(): boolean {
    if (this.missedCount >= this.maxMissed) {
      this.stop();
      this.onTimeout?.();
      return false;
    }
    this.missedCount++;
    this.lastPingSentAt = Date.now();
    this.lastPingId = `ping-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return this.sendFn({
      id: this.lastPingId,
      type: 'ping',
      payload: { id: this.lastPingId },
      timestamp: this.lastPingSentAt,
    });
  }

  handleIncomingMessage(msg: P2PDataMessage): boolean {
    if (msg.type === 'ping') {
      this.sendFn({
        id: `pong-${Date.now()}`,
        type: 'pong',
        payload: { pingId: msg.id },
        timestamp: Date.now(),
      });
      return true;
    }
    if (msg.type === 'pong') {
      this.missedCount = 0;
      if (this.lastPingSentAt > 0) {
        this.latencyMs = Math.max(0, Date.now() - this.lastPingSentAt);
      }
      return true;
    }
    return false;
  }

  getMissedCount(): number {
    return this.missedCount;
  }

  getLatencyMs(): number {
    return this.latencyMs;
  }
}
