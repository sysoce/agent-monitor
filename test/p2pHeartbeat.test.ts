import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { P2PHeartbeat } from '../src/p2p/p2pHeartbeat';
import type { P2PDataMessage } from '../src/p2p/types';

describe('P2PHeartbeat', () => {
  it('sends ping messages at the specified interval', async () => {
    const sent: P2PDataMessage[] = [];
    const hb = new P2PHeartbeat({
      intervalMs: 20,
      maxMissed: 3,
      sendFn: (msg) => {
        sent.push(msg);
        return true;
      },
    });

    hb.start();
    await new Promise((resolve) => setTimeout(resolve, 50));
    hb.stop();

    assert.ok(sent.length >= 2);
    assert.equal(sent[0].type, 'ping');
  });

  it('resets missed count and calculates latency on receiving pong', async () => {
    let lastSentPingId = '';
    const hb = new P2PHeartbeat({
      intervalMs: 100,
      sendFn: (msg) => {
        lastSentPingId = msg.id;
        return true;
      },
    });

    hb.sendPing();
    assert.equal(hb.getMissedCount(), 1);

    hb.handleIncomingMessage({
      id: 'pong-1',
      type: 'pong',
      payload: { pingId: lastSentPingId },
      timestamp: Date.now(),
    });

    assert.equal(hb.getMissedCount(), 0);
    assert.ok(hb.getLatencyMs() >= 0);
  });

  it('triggers onTimeout when maxMissed pings are reached without response', async () => {
    let timedOut = false;
    const hb = new P2PHeartbeat({
      intervalMs: 15,
      maxMissed: 2,
      sendFn: () => true,
      onTimeout: () => {
        timedOut = true;
      },
    });

    hb.start();
    await new Promise((resolve) => setTimeout(resolve, 60));
    hb.stop();

    assert.equal(timedOut, true);
  });
});
