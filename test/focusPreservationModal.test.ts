import { test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { captureFocusState, restoreScrollState } from '../src/ui/domFocusPreserver';

let originalDocument: any;

beforeEach(() => {
  originalDocument = (globalThis as any).document;
});

afterEach(() => {
  (globalThis as any).document = originalDocument;
});

test('captureFocusState captures settings modal body scrollTop', () => {
  const mockSettingsBody = {
    scrollTop: 280,
  };

  (globalThis as any).document = {
    activeElement: null,
    querySelector: (sel: string) => {
      if (sel.includes('.settings-modal-body')) return mockSettingsBody;
      return null;
    },
    getElementById: () => null,
  };

  const snapshot = captureFocusState();
  assert.equal(snapshot.settingsModalScrollTop, 280);
});

test('restoreScrollState restores settings modal body scrollTop', () => {
  let scrollTopVal = 0;
  const mockSettingsBody = {
    get scrollTop() { return scrollTopVal; },
    set scrollTop(v: number) { scrollTopVal = v; },
  };

  (globalThis as any).document = {
    querySelector: (sel: string) => {
      if (sel.includes('.settings-modal-body')) return mockSettingsBody;
      return null;
    },
    getElementById: () => null,
  };

  const snapshot = {
    activeElementId: null,
    selectionStart: null,
    selectionEnd: null,
    value: null,
    scrollTop: null,
    chatScrollTop: null,
    isChatNearBottom: false,
    sidebarScrollTop: null,
    plansScrollTop: null,
    settingsModalScrollTop: 340,
  };

  restoreScrollState(snapshot, 'chat');
  assert.equal(scrollTopVal, 340, 'Settings modal scroll offset should be preserved');
});
