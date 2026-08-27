import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GistSyncConfig } from './types';
export { encodeSetupPayload, decodeSetupPayload } from './payloadCodec';

export function loadSyncConfig(workspaceRoot: string, password?: string): GistSyncConfig | undefined {
  const token = process.env.GITHUB_TOKEN || process.env.AGENT_SYNC_TOKEN;
  const gistId = process.env.AGENT_SYNC_GIST_ID || process.env.GIST_ID;

  if (token && gistId) {
    return { token, gistId, password };
  }

  const cfgPath = path.join(workspaceRoot, '.agent', 'sync-config.json');
  try {
    if (fs.existsSync(cfgPath)) {
      const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
        token?: string;
        gistId?: string;
        password?: string;
      };
      if (raw.token && raw.gistId) {
        return { token: raw.token, gistId: raw.gistId, password: password || raw.password };
      }
    }
  } catch {}

  return undefined;
}

export async function saveSyncConfig(workspaceRoot: string, config: GistSyncConfig): Promise<string> {
  const agentDir = path.join(workspaceRoot, '.agent');
  await fs.promises.mkdir(agentDir, { recursive: true });
  const cfgPath = path.join(agentDir, 'sync-config.json');
  await fs.promises.writeFile(cfgPath, JSON.stringify(config, null, 2), 'utf8');
  return cfgPath;
}
