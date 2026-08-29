import test from 'node:test';
import * as assert from 'node:assert/strict';
import { isAutoFallbackEnabled, setAutoFallbackEnabled } from '../src/ui/fallbackSettings';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import { renderSettingsSyncSection } from '../src/ui/components/settingsModal/settingsSyncSection';
import { handleControlClick } from '../src/ui/controlHandlers';
import { parseUrlConfig, applyConfigToStorage } from '../src/ui/urlConfigLoader';
import type { AppState } from '../src/ui/types';

test('isAutoFallbackEnabled defaults to true when localStorage is empty', () => {
  const fakeStorage: any = {
    getItem: () => null,
    setItem: () => {},
  };
  assert.equal(isAutoFallbackEnabled(fakeStorage), true);
});

test('setAutoFallbackEnabled persists boolean string to storage', () => {
  const data: Record<string, string> = {};
  const fakeStorage: any = {
    setItem(k: string, v: string) { data[k] = v; },
    getItem(k: string) { return data[k] || null; },
  };
  setAutoFallbackEnabled(false, fakeStorage);
  assert.equal(isAutoFallbackEnabled(fakeStorage), false);

  setAutoFallbackEnabled(true, fakeStorage);
  assert.equal(isAutoFallbackEnabled(fakeStorage), true);
});

test('SyncStateMachine respects autoFallback disabled on SSE failure and stays in current mode', () => {
  let activeMode = 'p2p';
  let activeStatus = '';
  const sm = new SyncStateMachine({
    onModeChange: (m) => { activeMode = m; },
    onStatusChange: (s) => { activeStatus = s; },
    onDataUpdate: () => {},
  });

  sm.setGistConfig({ token: 'test-pat', gistId: 'gist-123' });
  sm.setAutoFallback(false);
  assert.equal(sm.getAutoFallback(), false);

  // Even with gistConfig present, when autoFallback is off, SSE failure should not switch to git-backup
  sm.handlePrimarySseFailure();
  assert.equal(activeMode, 'p2p');
  assert.equal(activeStatus, 'disconnected');
  sm.stop();
});

test('SyncStateMachine suppresses triggerLiveServerReachable when autoFallback is disabled', () => {
  let recovered = false;
  const sm = new SyncStateMachine({
    onModeChange: () => {},
    onStatusChange: () => {},
    onDataUpdate: () => {},
    onLiveServerReachable: () => { recovered = true; },
  });

  sm.setGistConfig({ token: 'test-pat', gistId: 'gist-123' });
  sm.forceGitBackupMode();
  sm.setAutoFallback(false);

  sm.triggerLiveServerReachable();
  assert.equal(recovered, false, 'Should not trigger reachability recovery when autoFallback is false');

  sm.setAutoFallback(true);
  sm.triggerLiveServerReachable();
  assert.equal(recovered, true, 'Should trigger reachability recovery when autoFallback is true');

  sm.stop();
});

test('renderSettingsSyncSection renders toggle-auto-fallback with proper checked status', () => {
  const stateEnabled: Partial<AppState> = {
    syncMode: 'live-sse',
    syncStatus: 'connected',
    autoFallbackEnabled: true,
  };
  const htmlEnabled = renderSettingsSyncSection(stateEnabled as AppState);
  assert.ok(htmlEnabled.includes('id="toggle-auto-fallback"'));
  assert.ok(htmlEnabled.includes('checked'));

  const stateDisabled: Partial<AppState> = {
    syncMode: 'live-sse',
    syncStatus: 'connected',
    autoFallbackEnabled: false,
  };
  const htmlDisabled = renderSettingsSyncSection(stateDisabled as AppState);
  assert.ok(htmlDisabled.includes('id="toggle-auto-fallback"'));
  assert.ok(!htmlDisabled.includes('checked'));
});

test('handleControlClick toggles autoFallback and triggers callbacks', () => {
  let toggledVal: boolean | undefined;
  let renderCalled = false;
  const state: Partial<AppState> = { autoFallbackEnabled: true };

  const fakeElement: any = {
    closest: (sel: string) => {
      if (sel.includes('toggle-auto-fallback')) {
        return { checked: false };
      }
      return null;
    },
  };

  const handled = handleControlClick(fakeElement, state as AppState, {
    onSelectSession: () => {},
    onNewSession: () => {},
    onSendMessage: () => {},
    onSelectPlan: () => {},
    onLoginSuccess: () => {},
    onRender: () => { renderCalled = true; },
    onToggleAutoFallback: (val) => { toggledVal = val; },
  });

  assert.equal(handled, true);
  assert.equal(state.autoFallbackEnabled, false);
  assert.equal(toggledVal, false);
  assert.equal(renderCalled, true);
});

test('urlConfigLoader parses fallback=0 and applies to storage', () => {
  const parsed = parseUrlConfig('#server=http://100.74.73.50:4200&fallback=0');
  assert.ok(parsed);
  assert.equal(parsed.serverUrl, 'http://100.74.73.50:4200');
  assert.equal(parsed.autoFallback, false);

  const data: Record<string, string> = {};
  const fakeStorage: any = {
    setItem(k: string, v: string) { data[k] = v; },
    getItem(k: string) { return data[k] || null; },
  };
  applyConfigToStorage(parsed, fakeStorage);
  assert.equal(data['agent_auto_fallback'], 'false');
});
