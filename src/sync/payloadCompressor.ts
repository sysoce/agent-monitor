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

export async function compressPayload(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  try {
    const zlib = getNodeZlib();
    if (zlib && typeof zlib.deflateSync === 'function') {
      const buffer = zlib.deflateSync(Buffer.from(plaintext, 'utf8'), { level: 6 });
      return `${COMPRESSED_PREFIX}${buffer.toString('base64')}`;
    }
    if (typeof CompressionStream !== 'undefined') {
      const stream = new Blob([plaintext]).stream().pipeThrough(new CompressionStream('deflate'));
      const buffer = await new Response(stream).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return `${COMPRESSED_PREFIX}${btoa(binary)}`;
    }
  } catch {}
  return plaintext;
}

export async function decompressPayload(raw: string): Promise<string> {
  if (!isCompressedPayload(raw)) return raw;
  try {
    const base64Data = raw.slice(COMPRESSED_PREFIX.length);
    const zlib = getNodeZlib();
    if (zlib && typeof zlib.inflateSync === 'function') {
      const buffer = zlib.inflateSync(Buffer.from(base64Data, 'base64'));
      return buffer.toString('utf8');
    }
    if (typeof DecompressionStream !== 'undefined') {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
      return await new Response(stream).text();
    }
  } catch {}
  return raw;
}
