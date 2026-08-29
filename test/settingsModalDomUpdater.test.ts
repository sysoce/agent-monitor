import test from 'node:test';
import * as assert from 'node:assert/strict';
import { updateSettingsModalDOM, initModalSectionsCache } from '../src/ui/settingsModalDomUpdater';
import { renderSettingsQrSection } from '../src/ui/components/settingsModal/settingsQrSection';
import { renderSettingsNetworkSection } from '../src/ui/components/settingsModal/settingsNetworkSection';
import { renderSettingsSyncSection } from '../src/ui/components/settingsModal/settingsSyncSection';
import { renderSettingsAppSection } from '../src/ui/components/settingsModal/settingsAppSection';
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
    attachments: [],
    isSettingsModalOpen: true,
    qrModalTarget: 'gh_pages',
    ...overrides,
  };
}

interface MockElement {
  id: string;
  dataset: Record<string, string>;
  replaceCount: number;
  outerHTML: string;
}

function createMockSection(id: string, initialHtml: string): MockElement {
  let html = initialHtml;
  const mock: MockElement = {
    id,
    dataset: { renderedHtml: initialHtml },
    replaceCount: 0,
    set outerHTML(val: string) {
      html = val;
      mock.dataset.renderedHtml = val;
      mock.replaceCount++;
    },
    get outerHTML() {
      return html;
    },
  };
  return mock;
}

test('updateSettingsModalDOM updates only changed QR section when tab changes', () => {
  const state = createMockState({ qrModalTarget: 'gh_pages' });
  const initialQrHtml = renderSettingsQrSection(state);
  const initialNetHtml = renderSettingsNetworkSection(state);
  const initialSyncHtml = renderSettingsSyncSection(state);
  const initialAppHtml = renderSettingsAppSection(state);

  const qrMock = createMockSection('settings-section-qr', initialQrHtml);
  const netMock = createMockSection('settings-section-network', initialNetHtml);
  const syncMock = createMockSection('settings-section-sync', initialSyncHtml);
  const appMock = createMockSection('settings-section-app', initialAppHtml);

  const modalEl: any = {
    id: 'settings-modal',
    querySelector(sel: string) {
      if (sel === '#settings-section-qr') return qrMock;
      if (sel === '#settings-section-network') return netMock;
      if (sel === '#settings-section-sync') return syncMock;
      if (sel === '#settings-section-app') return appMock;
      return null;
    },
  };

  // Switch QR tab to LAN
  state.qrModalTarget = 'lan';
  updateSettingsModalDOM(state, modalEl);

  assert.equal(qrMock.replaceCount, 1, 'QR section should be replaced');
  assert.equal(netMock.replaceCount, 0, 'Network section should NOT be replaced');
  assert.equal(syncMock.replaceCount, 0, 'Sync section should NOT be replaced');
  assert.equal(appMock.replaceCount, 0, 'App section should NOT be replaced');
  assert.ok(qrMock.dataset.renderedHtml.includes('qr-tab-lan active') || qrMock.dataset.renderedHtml.includes('id="qr-tab-lan" class="qr-tab-btn active"'));
});

test('initModalSectionsCache tags all 4 sections with renderedHtml dataset', () => {
  const state = createMockState();
  const qrMock: any = { id: 'settings-section-qr', dataset: {} };
  const netMock: any = { id: 'settings-section-network', dataset: {} };
  const syncMock: any = { id: 'settings-section-sync', dataset: {} };
  const appMock: any = { id: 'settings-section-app', dataset: {} };

  const modalEl: any = {
    id: 'settings-modal',
    querySelector(sel: string) {
      if (sel === '#settings-section-qr') return qrMock;
      if (sel === '#settings-section-network') return netMock;
      if (sel === '#settings-section-sync') return syncMock;
      if (sel === '#settings-section-app') return appMock;
      return null;
    },
  };

  initModalSectionsCache(modalEl, state);

  assert.ok(qrMock.dataset.renderedHtml.includes('settings-section--qr'));
  assert.ok(netMock.dataset.renderedHtml.includes('settings-section--network'));
  assert.ok(syncMock.dataset.renderedHtml.includes('settings-section--sync'));
  assert.ok(appMock.dataset.renderedHtml.includes('settings-section--app'));
});
