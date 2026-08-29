import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { P2PDataChannel } from '../src/p2p/p2pDataChannel';
import type { P2PDataMessage } from '../src/p2p/types';

describe('P2PDataChannel', () => {
  it('serializes and dispatches outgoing messages through mock underlying channel', () => {
    let sentData = '';
    const mockChannel = {
      readyState: 'open',
      send: (data: string) => { sentData = data; },
      onmessage: null as any,
      onopen: null as any,
      onclose: null as any,
      onerror: null as any,
    };

    const channel = new P2PDataChannel(mockChannel as any);
    const msg: P2PDataMessage = {
      id: 'msg-1',
      type: 'user_input',
      sessionId: 'sess-1',
      payload: { text: 'test query' },
      timestamp: 1000,
    };

    channel.send(msg);
    assert.ok(sentData.length > 0);
    const parsed = JSON.parse(sentData);
    assert.equal(parsed.id, 'msg-1');
    assert.equal(parsed.type, 'user_input');
    assert.equal(parsed.payload.text, 'test query');
  });

  it('receives incoming framed messages and triggers message listeners', () => {
    let receivedMsg: P2PDataMessage | null = null;
    const mockChannel = {
      readyState: 'open',
      send: () => {},
      onmessage: null as any,
      onopen: null as any,
      onclose: null as any,
      onerror: null as any,
    };

    const channel = new P2PDataChannel(mockChannel as any);
    channel.onMessage((msg) => {
      receivedMsg = msg;
    });

    const incoming: P2PDataMessage = {
      id: 'stream-1',
      type: 'stream_delta',
      sessionId: 'sess-1',
      payload: { delta: 'Hello from peer' },
      timestamp: Date.now(),
    };

    mockChannel.onmessage({ data: JSON.stringify(incoming) });
    assert.ok(receivedMsg);
    assert.equal((receivedMsg as P2PDataMessage).id, 'stream-1');
    assert.equal((receivedMsg as P2PDataMessage).payload.delta, 'Hello from peer');
  });
});
