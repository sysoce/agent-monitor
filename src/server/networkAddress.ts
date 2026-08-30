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

  // Sort standard LAN (e.g. Wi-Fi / en0 / 192.168.x.x / 10.x.x.x) first, Tailscale secondary
  return results.sort((a, b) => {
    if (Boolean(a.isTailscale) !== Boolean(b.isTailscale)) {
      return a.isTailscale ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });
}
