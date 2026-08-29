import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultIceServers, parseIceServers } from '../src/p2p/p2pIceConfig';

describe('p2pIceConfig', () => {
  it('returns default STUN servers when no custom servers provided', () => {
    const servers = getDefaultIceServers();
    assert.ok(Array.isArray(servers));
    assert.ok(servers.length >= 2);
    assert.ok(servers.some((s) => s.urls.includes('stun.l.google.com')));
    assert.ok(servers.some((s) => s.urls.includes('twilio.com')));
  });

  it('parses comma-separated custom STUN/TURN URLs', () => {
    const custom = 'stun:custom.stun.org:3478,turn:turn.example.com:3478';
    const parsed = parseIceServers(custom);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].urls, 'stun:custom.stun.org:3478');
    assert.equal(parsed[1].urls, 'turn:turn.example.com:3478');
  });

  it('returns default servers when custom string is empty or invalid', () => {
    assert.deepEqual(parseIceServers(''), getDefaultIceServers());
    assert.deepEqual(parseIceServers('   '), getDefaultIceServers());
  });
});
