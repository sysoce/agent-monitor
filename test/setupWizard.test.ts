import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { runSetupWizard } from '../src/setup/setupWizard';
import { exportStandaloneBundle } from '../src/setup/standaloneExporter';

test('runSetupWizard in non-interactive mode saves config and generates mobile URL and QR code', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-wizard-'));
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (url: string | URL | Request) => {
    const sUrl = String(url);
    if (sUrl.includes('/gists/existing_gist')) {
      return { ok: true, json: async () => ({ id: 'existing_gist' }) } as Response;
    }
    if (sUrl.endsWith('/gists')) {
      return { ok: true, json: async () => ({ id: 'created_gist_123', html_url: 'https://gist.github.com/created_gist_123' }) } as Response;
    }
    return { ok: false, status: 404 } as Response;
  }) as typeof fetch;

  try {
    const res = await runSetupWizard({
      workspaceRoot: tmpDir,
      token: 'ghp_mock_token_12345',
      gistId: 'existing_gist',
      password: 'mypassword123',
      nonInteractive: true,
      port: 4200,
    });

    assert.equal(res.config.token, 'ghp_mock_token_12345');
    assert.equal(res.config.gistId, 'existing_gist');
    assert.equal(res.config.password, 'mypassword123');
    assert.ok(res.mobileUrl.includes('#setup='));
    assert.ok(res.qrTerminal.length > 50);
    assert.ok(res.qrSvg.startsWith('<svg'));

    const savedRaw = await fs.readFile(path.join(tmpDir, '.agent', 'sync-config.json'), 'utf8');
    const saved = JSON.parse(savedRaw);
    assert.equal(saved.token, 'ghp_mock_token_12345');
    assert.equal(saved.gistId, 'existing_gist');
  } finally {
    globalThis.fetch = originalFetch;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('exportStandaloneBundle creates or copies standalone html file', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-export-'));
  try {
    const outPath = await exportStandaloneBundle(process.cwd(), { outDir: tmpDir });
    assert.ok(outPath.endsWith('standalone.html'));
    const content = await fs.readFile(outPath, 'utf8');
    assert.ok(content.includes('<!DOCTYPE html>') || content.includes('<html'));
    assert.ok(content.includes('Agent Monitor'));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
