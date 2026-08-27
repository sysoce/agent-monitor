import * as readline from 'node:readline';
import { execSync } from 'node:child_process';
import type { GistSyncConfig } from '../sync/types';
import { loadSyncConfig, saveSyncConfig, encodeSetupPayload } from '../sync/syncConfigLoader';
import { createSecretGist, verifyGistAccess } from '../sync/gistCreator';
import { generateSecurePin } from '../server/auth';
import { getLocalNetworkAddresses } from '../server/networkAddress';
import { generateQrMatrix } from '../qr/qrEncoder';
import { renderQrToTerminal, renderQrToSvg } from '../qr/qrRenderer';

export interface SetupWizardOptions {
  workspaceRoot?: string;
  token?: string;
  gistId?: string;
  password?: string;
  port?: number;
  nonInteractive?: boolean;
}

export interface SetupWizardResult {
  config: GistSyncConfig;
  setupPayload: string;
  mobileUrl: string;
  qrTerminal: string;
  qrSvg: string;
}

function tryGetGhToken(): string | undefined {
  try {
    const out = execSync('gh auth token', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const trimmed = out.trim();
    if (trimmed && (trimmed.startsWith('ghp_') || trimmed.startsWith('github_pat_') || trimmed.length > 20)) {
      return trimmed;
    }
  } catch {}
  return undefined;
}

async function promptInput(promptText: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(promptText, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

export async function runSetupWizard(options: SetupWizardOptions = {}): Promise<SetupWizardResult> {
  const root = options.workspaceRoot || process.cwd();
  const existing = loadSyncConfig(root);
  let token = options.token || process.env.GITHUB_TOKEN || process.env.AGENT_SYNC_TOKEN || existing?.token || tryGetGhToken();

  if (!token && !options.nonInteractive) {
    console.log('\n📱 Agent Mobile Monitor Setup Wizard');
    console.log('--------------------------------------------------');
    console.log('To sync between your computer and phone via GitHub Gist,');
    console.log('a GitHub Personal Access Token with "gist" scope is required.');
    console.log('Create one at: https://github.com/settings/tokens/new?scopes=gist&description=AgentMonitor\n');
    token = await promptInput('Enter GitHub Token (ghp_...): ');
  }

  if (!token) {
    throw new Error('GitHub token is required for Gist sync setup. Set GITHUB_TOKEN or install/authenticate GitHub CLI (gh).');
  }

  let gistId = options.gistId || process.env.AGENT_SYNC_GIST_ID || existing?.gistId;
  if (gistId) {
    const ok = await verifyGistAccess(token, gistId);
    if (!ok) gistId = undefined;
  }

  if (!gistId) {
    const created = await createSecretGist(token);
    gistId = created.gistId;
  }

  const password = options.password || existing?.password || generateSecurePin();
  const config: GistSyncConfig = { token, gistId, password };
  await saveSyncConfig(root, config);

  const setupPayload = encodeSetupPayload(config);
  const port = options.port || 4200;
  const networks = getLocalNetworkAddresses(port);
  const bestAddress = networks.find((n) => n.isTailscale) || networks.find((n) => !n.name.includes('localhost')) || { url: `http://localhost:${port}` };
  const mobileUrl = `${bestAddress.url}/#setup=${setupPayload}`;

  const matrix = generateQrMatrix(mobileUrl);
  const qrTerminal = renderQrToTerminal(matrix);
  const qrSvg = renderQrToSvg(matrix);

  return { config, setupPayload, mobileUrl, qrTerminal, qrSvg };
}
