export interface P2PIceServerConfig {
  urls: string;
  username?: string;
  credential?: string;
}

export function getDefaultIceServers(): P2PIceServerConfig[] {
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];
}

export function parseIceServers(custom?: string): P2PIceServerConfig[] {
  if (!custom || !custom.trim()) {
    return getDefaultIceServers();
  }
  const parts = custom
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return getDefaultIceServers();
  }
  return parts.map((url) => ({ urls: url }));
}
