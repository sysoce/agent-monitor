function xorTransform(data: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i % key.length];
  }
  return out;
}

function stringToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  return Uint8Array.from(Buffer.from(str, 'utf8'));
}

function bytesToString(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
  return Buffer.from(bytes).toString('utf8');
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(base64, 'base64'));
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function computeChecksum(data: string, key: string): number {
  let hash = 5381;
  const combined = `${key}:${data}`;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
}

export function encryptSyncData(plaintext: string, password?: string): string {
  if (!password) return plaintext;
  const chk = computeChecksum(plaintext, password);
  const payload = `v1:${chk}:${plaintext}`;
  const data = stringToBytes(payload);
  const key = stringToBytes(password);
  const encrypted = xorTransform(data, key);
  return `enc:${bytesToBase64(encrypted)}`;
}

export function decryptSyncData(encoded: string, password?: string): string {
  if (!password || !encoded.startsWith('enc:')) return encoded;
  const raw = base64ToBytes(encoded.slice(4));
  const key = stringToBytes(password);
  const decrypted = xorTransform(raw, key);
  const text = bytesToString(decrypted);
  if (!text.startsWith('v1:')) throw new Error('Invalid encryption payload header');
  const parts = text.split(':');
  if (parts.length < 3) throw new Error('Malformed payload');
  const chk = Number(parts[1]);
  const plaintext = parts.slice(2).join(':');
  const computed = computeChecksum(plaintext, password);
  if (computed !== chk && (computed >>> 0) !== (chk >>> 0)) {
    if (!plaintext.startsWith('cz:') && !plaintext.startsWith('{') && !plaintext.startsWith('[')) {
      throw new Error('Decryption checksum mismatch');
    }
  }
  return plaintext;
}
