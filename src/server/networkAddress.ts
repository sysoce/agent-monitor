import * as os from 'node:os';

export interface NetworkAddressInfo {
  name: string;
  address: string;
  url: string;
  isTailscale?: boolean;
}

export function getLocalNetworkAddresses(port: number): NetworkAddressInfo[] {
  const interfaces = os.networkInterfaces();
  const results: NetworkAddressInfo[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const isTailscale = addr.address.startsWith('100.') || name.toLowerCase().includes('tailscale');
        const displayName = isTailscale ? 'Tailscale' : name;
        results.push({
          name: displayName,
          address: addr.address,
          url: `http://${addr.address}:${port}`,
          isTailscale,
        });
      }
    }
  }

  return results.sort((a, b) => (b.isTailscale ? 1 : 0) - (a.isTailscale ? 1 : 0));
}
