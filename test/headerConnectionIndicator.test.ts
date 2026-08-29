import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderNavHeader } from '../src/ui/components/navHeader';
import type { AppState } from '../src/ui/types';

const baseState: AppState = {
  activeTab: 'sidebar',
  sessions: [],
  plans: [],
  syncStatus: 'connected',
  searchQuery: '',
  composerMode: 'agent',
  selectedModel: 'gemini-3.7-flash',
  availableModels: [],
  isSending: false,
  isAuthenticated: true,
};

test('renderNavHeader renders (LAN) indicator with IP address', () => {
  const state: AppState = {
    ...baseState,
    selectedLanIp: 'http://192.168.1.111:4200',
  };

  const html = renderNavHeader(state);
  assert.match(html, /192\.168\.1\.111/);
  assert.match(html, /\(LAN\)/);
  assert.match(html, /indicator-connection-endpoint/);
  assert.match(html, /pill-lan/);
});

test('renderNavHeader renders (Tailscale) indicator with Tailscale IP', () => {
  const state: AppState = {
    ...baseState,
    selectedLanIp: 'http://100.85.12.3:4200',
  };

  const html = renderNavHeader(state);
  assert.match(html, /100\.85\.12\.3/);
  assert.match(html, /\(Tailscale\)/);
  assert.match(html, /indicator-connection-endpoint/);
  assert.match(html, /pill-tailscale/);
});
