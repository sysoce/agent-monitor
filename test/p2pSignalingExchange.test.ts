import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  postSignalToLan,
  fetchSignalsFromLan,
  postSignalToGist,
  fetchSignalsFromGist,
} from '../src/p2p/p2pSignalingExchange';
import type { P2PSignalMessage } from '../src/p2p/types';

describe('p2pSignalingExchange', () => {
  it('posts and fetches signals to LAN endpoint using fetch', async () => {
    const originalFetch = globalThis.fetch;
    const sentRequests: any[] = [];

    globalThis.fetch = (async (url: string, init?: any) => {
      sentRequests.push({ url, init });
      if (init?.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true }) } as any;
      }
      return {
        ok: true,
        json: async () => ({
          ok: true,
          signals: [
            {
              type: 'offer',
              senderId: 'host-1',
              recipientId: 'client-1',
              payload: { sdp: 'test' },
              timestamp: Date.now(),
            },
          ],
        }),
      } as any;
    }) as any;

    try {
      const signal: P2PSignalMessage = {
        type: 'offer',
        senderId: 'host-1',
        payload: { sdp: 'test' },
        timestamp: Date.now(),
      };

      const postOk = await postSignalToLan('http://localhost:4200', signal);
      assert.equal(postOk, true);
      assert.equal(sentRequests.length, 1);

      const signals = await fetchSignalsFromLan('http://localhost:4200', 'client-1');
      assert.equal(signals.length, 1);
      assert.equal(signals[0].type, 'offer');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('posts and fetches signals via Gist mailbox', async () => {
    const originalFetch = globalThis.fetch;
    let savedContent = '';

    globalThis.fetch = (async (url: string, init?: any) => {
      if (init?.method === 'PATCH') {
        const body = JSON.parse(init.body);
        savedContent = body.files['signal.json'].content;
        return { ok: true } as any;
      }
      return {
        ok: true,
        json: async () => ({
          files: {
            'signal.json': { content: savedContent },
          },
        }),
      } as any;
    }) as any;

    try {
      const config = {
        token: 'ghp_fake',
        gistId: 'gist-123',
        password: 'pass',
      };

      const signal: P2PSignalMessage = {
        type: 'answer',
        senderId: 'client-1',
        recipientId: 'host-1',
        payload: { sdp: 'ans' },
        timestamp: Date.now(),
      };

      const ok = await postSignalToGist(config, signal);
      assert.equal(ok, true);

      const fetched = await fetchSignalsFromGist(config);
      assert.equal(fetched.length, 1);
      assert.equal(fetched[0].type, 'answer');
      assert.equal(fetched[0].senderId, 'client-1');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
