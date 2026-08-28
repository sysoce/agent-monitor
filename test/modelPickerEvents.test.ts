import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { MockElement, installMockDocument } from './stubs/mockDom';
import type { AppState } from '../src/ui/types';
import { MONITOR_MODEL_GROUPS } from '../src/server/modelsCatalog';
import {
  handleModelPickerClick,
  setupModelSearchInput,
  filterModelListInPlace,
  handleModelMenuKeyboardNav,
} from '../src/ui/modelPickerEvents';

describe('Model Picker Events & Delegation', () => {
  let state: AppState;
  let renderCount: number;
  let selectedModelId: string | null;

  beforeEach(() => {
    installMockDocument();
    renderCount = 0;
    selectedModelId = null;
    state = {
      activeTab: 'chat',
      sessions: [],
      plans: [],
      syncStatus: 'connected',
      searchQuery: '',
      composerMode: 'agent',
      selectedModel: 'antigravity|gemini-3.7-flash-high|model',
      availableModels: [],
      modelGroups: MONITOR_MODEL_GROUPS,
      isSending: false,
      isAuthenticated: true,
      attachments: [],
      isModelPickerOpen: false,
      modelSearchQuery: '',
    };
  });

  const callbacks = {
    onRender: () => { renderCount++; },
    onSelectModel: (id: string) => { selectedModelId = id; },
  };

  it('toggles isModelPickerOpen when clicking #btn-model-toggle', () => {
    const btn = new MockElement('button');
    btn.setAttribute('id', 'btn-model-toggle');
    btn.className = 'model-picker-btn';

    const handled = handleModelPickerClick(btn as any, state, callbacks);
    assert.equal(handled, true);
    assert.equal(state.isModelPickerOpen, true);
    assert.equal(renderCount, 1);

    const handledSecond = handleModelPickerClick(btn as any, state, callbacks);
    assert.equal(handledSecond, true);
    assert.equal(state.isModelPickerOpen, false);
    assert.equal(renderCount, 2);
  });

  it('selects model and closes picker when clicking .model-picker-item', () => {
    state.isModelPickerOpen = true;
    const item = new MockElement('button');
    item.className = 'model-picker-item';
    item.setAttribute('data-model-id', 'cursor|auto|model');

    const handled = handleModelPickerClick(item as any, state, callbacks);
    assert.equal(handled, true);
    assert.equal(state.selectedModel, 'cursor|auto|model');
    assert.equal(selectedModelId, 'cursor|auto|model');
    assert.equal(state.isModelPickerOpen, false);
    assert.equal(renderCount, 1);
  });

  it('closes picker on outside click without blocking other interactions', () => {
    state.isModelPickerOpen = true;
    const outsideEl = new MockElement('div');
    outsideEl.className = 'chat-messages';

    const handled = handleModelPickerClick(outsideEl as any, state, callbacks);
    assert.equal(handled, false);
    assert.equal(state.isModelPickerOpen, false);
    assert.equal(renderCount, 1);
  });

  it('does not close picker when clicking inside dropdown menu', () => {
    state.isModelPickerOpen = true;
    const wrapper = new MockElement('div');
    wrapper.className = 'model-picker-wrapper';
    const menu = new MockElement('div');
    menu.className = 'model-picker-menu';
    wrapper.appendChild(menu);
    const searchRow = new MockElement('div');
    searchRow.className = 'model-menu-search-row';
    menu.appendChild(searchRow);

    const handled = handleModelPickerClick(searchRow as any, state, callbacks);
    assert.equal(handled, true);
    assert.equal(state.isModelPickerOpen, true);
    assert.equal(renderCount, 0);
  });

  it('filterModelListInPlace updates #model-menu-list innerHTML directly', () => {
    const listEl = new MockElement('div');
    listEl.setAttribute('id', 'model-menu-list');
    (global as any).document.getElementById = (id: string) => (id === 'model-menu-list' ? listEl : null);

    state.modelSearchQuery = 'Claude';
    filterModelListInPlace(state);

    assert.ok(listEl.innerHTML.includes('Claude 3.7 Sonnet'));
    assert.ok(!listEl.innerHTML.includes('Cursor Auto'));
  });

  it('handleModelMenuKeyboardNav cycles focus between model items', () => {
    const item1 = new MockElement('button');
    item1.className = 'model-picker-item';
    const item2 = new MockElement('button');
    item2.className = 'model-picker-item';

    (global as any).document.querySelectorAll = (sel: string) => (sel === '.model-picker-item' ? [item1, item2] : []);
    (global as any).document.activeElement = item1;

    let focused = false;
    item2.focus = () => { focused = true; };
    handleModelMenuKeyboardNav('ArrowDown');
    assert.equal(focused, true);
  });

  it('setupModelSearchInput binds safely and handles Escape to close', () => {
    state.isModelPickerOpen = true;
    const input = new MockElement('input');
    input.setAttribute('id', 'model-search-input');
    const listeners: Record<string, Function> = {};
    input.addEventListener = (ev: string, fn: any) => { listeners[ev] = fn; };
    (global as any).document.getElementById = (id: string) => (id === 'model-search-input' ? input : null);

    setupModelSearchInput(state, callbacks);
    assert.equal(input.dataset.bound, 'true');

    listeners['keydown']?.({ key: 'Escape', stopPropagation: () => {} });
    assert.equal(state.isModelPickerOpen, false);

    // Re-calling setupModelSearchInput is idempotent
    setupModelSearchInput(state, callbacks);
    assert.equal(input.dataset.bound, 'true');
  });
});
