import test from 'node:test';
import * as assert from 'node:assert/strict';
import {
  getConnectionEndpointInfo,
  detectIsTailscale,
  extractHostFromUrl,
} from '../src/ui/components/connectionEndpointInfo';
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

test('detectIsTailscale correctly detects Tailscale CGNAT IPs and hostnames', () => {
  assert.equal(detectIsTailscale('100.80.20.10'), true);
  assert.equal(detectIsTailscale('100.115.92.12'), true);
  assert.equal(detectIsTailscale('macbook-air.tailscale01.ts.net'), true);
  assert.equal(detectIsTailscale('my-tailscale-node'), true);
  assert.equal(detectIsTailscale('192.168.1.111'), false);
  assert.equal(detectIsTailscale('10.0.0.5'), false);
  assert.equal(detectIsTailscale('127.0.0.1'), false);
  assert.equal(detectIsTailscale('localhost'), false);
});

test('extractHostFromUrl cleanly extracts host without protocol or port', () => {
  assert.equal(extractHostFromUrl('http://192.168.1.111:4200'), '192.168.1.111');
  assert.equal(extractHostFromUrl('http://100.80.20.10:4200/#setup=abc'), '100.80.20.10');
  assert.equal(extractHostFromUrl('192.168.1.50:4200'), '192.168.1.50');
  assert.equal(extractHostFromUrl('http://localhost:4200'), 'localhost');
});

test('getConnectionEndpointInfo detects LAN connection from selectedLanIp or lanUrl', () => {
  const state: AppState = {
    ...baseState,
    selectedLanIp: 'http://192.168.1.111:4200',
  };

  const info = getConnectionEndpointInfo(state);
  assert.equal(info.ip, '192.168.1.111');
  assert.equal(info.connectionType, 'LAN');
  assert.equal(info.isTailscale, false);
  assert.equal(info.displayText, '192.168.1.111 (LAN)');
});

test('getConnectionEndpointInfo detects Tailscale connection from 100.x IP', () => {
  const state: AppState = {
    ...baseState,
    selectedLanIp: 'http://100.85.12.3:4200',
  };

  const info = getConnectionEndpointInfo(state);
  assert.equal(info.ip, '100.85.12.3');
  assert.equal(info.connectionType, 'Tailscale');
  assert.equal(info.isTailscale, true);
  assert.equal(info.displayText, '100.85.12.3 (Tailscale)');
});

test('getConnectionEndpointInfo matches against serverSetupInfo networks', () => {
  const state: AppState = {
    ...baseState,
    serverSetupInfo: {
      networks: [
        { name: 'en0', address: '192.168.1.88', url: 'http://192.168.1.88:4200', isTailscale: false },
        { name: 'Tailscale', address: '100.64.0.1', url: 'http://100.64.0.1:4200', isTailscale: true },
      ],
    },
    selectedLanIp: 'http://100.64.0.1:4200',
  };

  const info = getConnectionEndpointInfo(state);
  assert.equal(info.ip, '100.64.0.1');
  assert.equal(info.connectionType, 'Tailscale');
  assert.equal(info.isTailscale, true);
  assert.equal(info.displayText, '100.64.0.1 (Tailscale)');
});
