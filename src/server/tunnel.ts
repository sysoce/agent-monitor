import { spawn, type ChildProcess } from 'node:child_process';

export interface TunnelInstance {
  url: string;
  close: () => void;
}

function spawnSshTunnel(
  args: string[],
  regex: RegExp,
  timeoutMs: number
): Promise<TunnelInstance | null> {
  return new Promise((resolve) => {
    let proc: ChildProcess | null = null;
    let resolved = false;

    try {
      proc = spawn('ssh', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { proc?.kill('SIGKILL'); } catch {}
        resolve(null);
      }
    }, timeoutMs);

    const onData = (data: Buffer) => {
      const match = data.toString().match(regex);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          url: match[0],
          close: () => {
            try { proc?.kill('SIGKILL'); } catch {}
          },
        });
      }
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.on('error', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    });
    proc.on('exit', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    });
  });
}

export async function startTunnel(port: number): Promise<TunnelInstance | null> {
  // Strategy 1: Pinggy via SSH (Fastest, zero-config, low-latency direct HTTPS)
  const pinggy = await spawnSshTunnel(
    [
      '-T',
      '-p', '443',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=3',
      '-R', `0:localhost:${port}`,
      'a.pinggy.io',
    ],
    /https:\/\/[a-zA-Z0-9-]+\.(free\.pinggy\.net|run\.pinggy-free\.link)/,
    6000
  );
  if (pinggy) return pinggy;

  // Strategy 2: localhost.run via SSH
  const lhr = await spawnSshTunnel(
    [
      '-T',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=3',
      '-R', `80:localhost:${port}`,
      'nokey@localhost.run',
    ],
    /https:\/\/[a-zA-Z0-9-]+\.lhr\.life/,
    8000
  );
  if (lhr) return lhr;

  // Strategy 3: localtunnel fallback
  return new Promise((resolve) => {
    let proc: ChildProcess | null = null;
    let resolved = false;

    try {
      proc = spawn('npx', ['--yes', 'localtunnel', '--port', String(port)], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { proc?.kill('SIGKILL'); } catch {}
        resolve(null);
      }
    }, 10000);

    proc.stdout?.on('data', (data: Buffer) => {
      const match = data.toString().match(/https:\/\/[^\s]+/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          url: match[0],
          close: () => {
            try { proc?.kill('SIGKILL'); } catch {}
          },
        });
      }
    });

    proc.on('error', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(null);
      }
    });
  });
}
