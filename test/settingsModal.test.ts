import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderSettingsModal } from '../src/ui/components/settingsModal/settingsModalView';
import { renderSettingsQrSection } from '../src/ui/components/settingsModal/settingsQrSection';
import { renderSettingsNetworkSection } from '../src/ui/components/settingsModal/settingsNetworkSection';
import { renderSettingsSyncSection } from '../src/ui/components/settingsModal/settingsSyncSection';
import { renderSettingsAppSection } from '../src/ui/components/settingsModal/settingsAppSection';
import { buildSettingsQrUrl } from '../src/ui/components/settingsModal/settingsQrBuilder';
import type { AppState } from '../src/ui/types';

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'sidebar',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'antigravity|gemini-3.7-flash-high|model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    ...overrides,
  };
}

test('buildSettingsQrUrl generates github pages url by default', () => {
  const url = buildSettingsQrUrl({
    target: 'gh_pages',
    payload: 'token-abc',
    origin: 'http://localhost:4200',
  });
  assert.equal(url, 'https://sysoce.github.io/agent-monitor/#setup=token-abc');
});

test('buildSettingsQrUrl generates local LAN url with selectedLanIp', () => {
  const url = buildSettingsQrUrl({
    target: 'lan',
    payload: 'token-abc',
    selectedLanIp: 'http://192.168.1.120:4200',
  });
  assert.equal(url, 'http://192.168.1.120:4200/#setup=token-abc');
});

test('renderSettingsModal returns empty string when closed', () => {
  const state = createMockState({ isSettingsModalOpen: false, isQrModalOpen: false });
  assert.equal(renderSettingsModal(state), '');
});

test('renderSettingsModal renders full modal with all sections and 3 sync modes when open', () => {
  const state = createMockState({
    isSettingsModalOpen: true,
    qrModalTarget: 'lan',
    serverSetupInfo: {
      githubPagesUrl: 'https://sysoce.github.io/agent-monitor/#setup=abc',
      lanUrl: 'http://192.168.1.50:4200/#setup=abc',
      setupPayload: 'abc',
      hasSyncConfig: true,
      networks: [
        { name: 'en0 (Wi-Fi)', address: '192.168.1.50', url: 'http://192.168.1.50:4200' },
        { name: 'utun3 (Tailscale)', address: '100.80.20.10', url: 'http://100.80.20.10:4200', isTailscale: true },
      ],
    },
  });

  const html = renderSettingsModal(state);
  assert.ok(html.includes('id="settings-modal"'));
  assert.ok(html.includes('Settings & Connect'));
  assert.ok(html.includes('id="qr-tab-gh"'));
  assert.ok(html.includes('id="qr-tab-lan"'));
  assert.ok(html.includes('id="qr-tab-dl"'));
  assert.ok(html.includes('id="btn-copy-qr-link"'));
  assert.ok(html.includes('192.168.1.50:4200'));
  assert.ok(html.includes('100.80.20.10:4200'));
  assert.ok(html.includes('Tailscale'));
  assert.ok(html.includes('data-set-sync-mode="p2p"'));
  assert.ok(html.includes('data-set-sync-mode="live-sse"'));
  assert.ok(html.includes('data-set-sync-mode="git-backup"'));
  assert.ok(html.includes('id="toggle-auto-fallback"'));
  assert.ok(html.includes('id="toggle-auto-update"'));
  assert.ok(html.includes('id="btn-settings-logout"'));
});

test('renderSettingsNetworkSection renders default LAN and Tailscale connections when state has no custom networks', () => {
  const state = createMockState();
  const html = renderSettingsNetworkSection(state);
  assert.ok(html.includes('192.168.1.111:4200'));
  assert.ok(html.includes('100.74.73.50:4200'));
  assert.ok(html.includes('Tailscale'));
});

