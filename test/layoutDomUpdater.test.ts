import test from 'node:test';
import * as assert from 'node:assert/strict';
import { updateLayoutDOM } from '../src/ui/layoutDomUpdater';
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
    ...overrides,
  };
}

test('updateLayoutDOM initializes layout on first render with containers and dataset cache', () => {
  let appInnerHtml = '';
  const app: any = {
    querySelector: () => null,
    set innerHTML(val: string) {
      appInnerHtml = val;
    },
    get innerHTML() {
      return appInnerHtml;
    },
  };

  const state = createMockState();
  const updated = updateLayoutDOM(app, state, '<div class="test-main">Main</div>', '');

  assert.equal(updated, true);
  assert.ok(appInnerHtml.includes('id="nav-container"'));
  assert.ok(appInnerHtml.includes('class="app-main"'));
  assert.ok(appInnerHtml.includes('id="modal-container"'));
});

test('updateLayoutDOM avoids re-rendering main and modal when renderedHtml matches', () => {
  let mainInnerHtmlSetCount = 0;
  let modalInnerHtmlSetCount = 0;

  const mainEl: any = {
    dataset: { renderedHtml: '<div class="test-main">Main Content</div>' },
    set innerHTML(_val: string) {
      mainInnerHtmlSetCount++;
    },
  };

  const modalContainer: any = {
    dataset: { renderedHtml: '<div id="settings-modal">Settings Content</div>' },
    set innerHTML(_val: string) {
      modalInnerHtmlSetCount++;
    },
  };

  const navContainer: any = {
    dataset: { renderedHtml: '' },
    set innerHTML(_val: string) {},
  };

  const layoutEl: any = {
    querySelector: (sel: string) => {
      if (sel === '#nav-container') return navContainer;
      if (sel === '.app-main') return mainEl;
      if (sel === '#modal-container') return modalContainer;
      if (sel === '.app-composer') return null;
      return null;
    },
    insertAdjacentHTML: () => {},
  };

  const app: any = {
    querySelector: (sel: string) => (sel === '.app-layout' ? layoutEl : null),
  };

  const state = createMockState();
  const updated = updateLayoutDOM(
    app,
    state,
    '<div class="test-main">Main Content</div>',
    '<div id="settings-modal">Settings Content</div>'
  );

  assert.equal(updated, false, 'mainUpdated should be false when main content unchanged');
  assert.equal(mainInnerHtmlSetCount, 0, 'Should not rewrite mainEl innerHTML');
  assert.equal(modalInnerHtmlSetCount, 0, 'Should not rewrite modalContainer innerHTML');
});
