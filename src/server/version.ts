import * as fs from 'node:fs';
import * as path from 'node:path';

declare const __MONITOR_VERSION__: string | undefined;

export const MONITOR_VERSION_FALLBACK = '1.0.12';

export function getMonitorVersion(): string {
  if (typeof __MONITOR_VERSION__ !== 'undefined' && __MONITOR_VERSION__) {
    return __MONITOR_VERSION__;
  }
  try {
    const candidatePaths = [
      path.join(__dirname, '../package.json'),
      path.join(__dirname, '../../package.json'),
      path.join(process.cwd(), 'package.json'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf8')) as { name?: string; version?: string };
        if (pkg.name === 'agent-monitor' && pkg.version) {
          return pkg.version;
        }
      }
    }
  } catch {}
  return MONITOR_VERSION_FALLBACK;
}
