import test from 'node:test';
import * as assert from 'node:assert/strict';
import {
  openQrModal,
  closeQrModal,
  selectQrTab,
  handleQrModalClick,
} from '../src/ui/qrModalEvents';
import type { AppState } from '../src/ui/types';

function createMockState(): AppState {
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
  };
}

test('openQrModal sets isQrModalOpen to true and triggers render', () => {
  const state = createMockState();
  let renderCount = 0;
  openQrModal(state, () => { renderCount++; });

  assert.equal(state.isQrModalOpen, true);
  assert.equal(state.qrModalTarget, 'gh_pages');
  assert.equal(renderCount, 1);
});

test('closeQrModal sets isQrModalOpen to false and clears feedback', () => {
  const state = createMockState();
  state.isQrModalOpen = true;
  state.qrCopyFeedback = 'link';

  let renderCount = 0;
  closeQrModal(state, () => { renderCount++; });

  assert.equal(state.isQrModalOpen, false);
  assert.equal(state.qrCopyFeedback, undefined);
  assert.equal(renderCount, 1);
});

test('selectQrTab changes qrModalTarget and triggers render', () => {
  const state = createMockState();
  let renderCount = 0;
  selectQrTab(state, 'lan', () => { renderCount++; });

  assert.equal(state.qrModalTarget, 'lan');
  assert.equal(renderCount, 1);
});

test('handleQrModalClick delegates clicks to open and tab buttons', () => {
  const state = createMockState();
  let renderCount = 0;
  const onRender = () => { renderCount++; };

  const fakeBtnShow = {
    id: 'btn-show-qr',
    closest(sel: string) { return sel.includes('#btn-show-qr') ? this : null; },
  } as unknown as HTMLElement;

  const handledShow = handleQrModalClick(state, fakeBtnShow, onRender);
  assert.equal(handledShow, true);
  assert.equal(state.isQrModalOpen, true);

  const fakeTabLan = {
    id: 'qr-tab-lan',
    closest(sel: string) { return sel.includes('#qr-tab-lan') ? this : null; },
  } as unknown as HTMLElement;

  const handledLan = handleQrModalClick(state, fakeTabLan, onRender);
  assert.equal(handledLan, true);
  assert.equal(state.qrModalTarget, 'lan');
});
