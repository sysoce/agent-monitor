import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderQrModal, buildQrSetupUrl } from '../src/ui/components/qrModal';
import { renderNavHeader } from '../src/ui/components/navHeader';
import { renderSidebarView } from '../src/ui/components/sidebarView';
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

test('buildQrSetupUrl generates github pages url by default', () => {
  const url = buildQrSetupUrl({
    target: 'gh_pages',
    payload: 'eyJ0b2tlbiI6InRlc3QifQ==',
    origin: 'http://localhost:4200',
  });
  assert.equal(url, 'https://sysoce.github.io/agent-monitor/#setup=eyJ0b2tlbiI6InRlc3QifQ==');
});

test('buildQrSetupUrl generates local LAN url when target is lan', () => {
  const url = buildQrSetupUrl({
    target: 'lan',
    payload: 'eyJ0b2tlbiI6InRlc3QifQ==',
    origin: 'http://192.168.1.100:4200',
  });
  assert.equal(url, 'http://192.168.1.100:4200/#setup=eyJ0b2tlbiI6InRlc3QifQ==');
});

test('renderQrModal renders modal with QR SVG and tabs when open', () => {
  const state = createMockState({
    isQrModalOpen: true,
    qrModalTarget: 'gh_pages',
    serverSetupInfo: {
      githubPagesUrl: 'https://sysoce.github.io/agent-monitor/#setup=abc',
      lanUrl: 'http://192.168.1.50:4200/#setup=abc',
      setupPayload: 'abc',
      hasSyncConfig: true,
    },
  });

  const html = renderQrModal(state);
  assert.ok(html.includes('id="qr-modal"'));
  assert.ok(html.includes('Connect Phone'));
  assert.ok(html.includes('id="qr-tab-gh"'));
  assert.ok(html.includes('id="qr-tab-lan"'));
  assert.ok(html.includes('id="qr-tab-dl"'));
  assert.ok(html.includes('<svg'));
  assert.ok(html.includes('id="btn-copy-qr-link"'));
  assert.ok(html.includes('id="mobile-link-url"'));
  assert.ok(html.includes('https://sysoce.github.io/agent-monitor/#setup=abc'));
});

test('renderNavHeader renders Connect Phone QR button', () => {
  const state = createMockState();
  const html = renderNavHeader(state);
  assert.ok(html.includes('id="btn-show-qr"'));
  assert.ok(html.includes('Connect Phone'));
});

test('renderSidebarView renders Connect Phone QR button', () => {
  const state = createMockState();
  const html = renderSidebarView(state);
  assert.ok(html.includes('id="btn-sidebar-qr"'));
  assert.ok(html.includes('Pair Phone'));
});
