const COMPRESSED_PREFIX = 'cz:';

function getNodeZlib(): any {
  try {
    if (typeof process !== 'undefined' && process.versions?.node) {
      const dynamicRequire = (typeof module !== 'undefined' && module.require) ||
        (globalThis as any).require ||
        new Function('name', 'try { return require(name); } catch { return null; }');
      return dynamicRequire('zlib');
    }
  } catch {}
  return null;
}

export function isCompressedPayload(payload: string): boolean {
  return typeof payload === 'string' && payload.startsWith(COMPRESSED_PREFIX);
}

export function compressPayload(plaintext: string): string {
  if (!plaintext) return plaintext;
  try {
    const zlib = getNodeZlib();
    if (zlib && typeof zlib.deflateSync === 'function') {
      const buffer = zlib.deflateSync(Buffer.from(plaintext, 'utf8'), { level: 6 });
      return `${COMPRESSED_PREFIX}${buffer.toString('base64')}`;
    }
  } catch {}
  return plaintext;
}

export function decompressPayload(raw: string): string {
  if (!isCompressedPayload(raw)) return raw;
  try {
    const zlib = getNodeZlib();
    const base64Data = raw.slice(COMPRESSED_PREFIX.length);
    if (zlib && typeof zlib.inflateSync === 'function') {
      const buffer = zlib.inflateSync(Buffer.from(base64Data, 'base64'));
      return buffer.toString('utf8');
    }
  } catch {}
  return raw;
}
