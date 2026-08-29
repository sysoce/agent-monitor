import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compressPayload, decompressPayload, isCompressedPayload } from '../src/sync/payloadCompressor';

describe('payloadCompressor', () => {
  it('compresses and decompresses text payloads with 100% fidelity', () => {
    const original = JSON.stringify({
      sessions: [
        { id: 'sess-1', title: 'Test Session', messages: [{ role: 'user', content: 'Hello world! '.repeat(500) }] },
      ],
      updatedAt: Date.now(),
    });

    const compressed = compressPayload(original);
    assert.ok(compressed.startsWith('cz:'), 'compressed payload should have cz: prefix');
    assert.ok(compressed.length < original.length / 2, 'compressed payload should be significantly smaller');

    const decompressed = decompressPayload(compressed);
    assert.equal(decompressed, original);
  });

  it('handles uncompressed raw text transparently for backward compatibility', () => {
    const uncompressedJson = JSON.stringify({ test: true, data: [1, 2, 3] });
    assert.equal(isCompressedPayload(uncompressedJson), false);
    assert.equal(decompressPayload(uncompressedJson), uncompressedJson);
  });

  it('detects compressed payloads via isCompressedPayload', () => {
    const compressed = compressPayload('some test payload');
    assert.equal(isCompressedPayload(compressed), true);
    assert.equal(isCompressedPayload('plain text'), false);
    assert.equal(isCompressedPayload(''), false);
  });
});
