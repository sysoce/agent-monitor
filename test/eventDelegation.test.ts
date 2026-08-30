import { test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { handleDelegatedClick } from '../src/ui/eventDelegation';
import type { AppState } from '../src/ui/types';

let origDoc: any, origNav: any;
beforeEach(() => { origDoc = (globalThis as any).document; origNav = (globalThis as any).navigator; });
afterEach(() => { (globalThis as any).document = origDoc; (globalThis as any).navigator = origNav; });

function createMockState(): AppState {
  return {
    activeTab: 'chat',
    sessions: [{ id: 's1', title: 'Session 1', preview: '', createdAt: 1, updatedAt: 2, messageCount: 1 }],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };
}

function createMockEl(opts: { id?: string; className?: string; attrs?: Record<string, string>; parent?: any }): any {
  const classes = new Set((opts.className || '').split(' ').filter(Boolean));
  const el: any = {
    id: opts.id || '',
    className: opts.className || '',
    parentElement: opts.parent || null,
    classList: {
      contains: (c: string) => classes.has(c),
      toggle: (c: string) => (classes.has(c) ? classes.delete(c) : classes.add(c), classes.has(c)),
    },
    getAttribute: (a: string) => opts.attrs?.[a] || null,
    closest: (sel: string) => {
      const parts = sel.split(',').map((s) => s.trim());
      let cur: any = el;
      while (cur) {
        for (const p of parts) {
          if (p.startsWith('.') && cur.classList?.contains(p.slice(1))) return cur;
          if (p.startsWith('#') && cur.id === p.slice(1)) return cur;
          if (p.includes('[data-tab]') && cur.getAttribute?.('data-tab')) return cur;
          if (p.includes('[data-plan-path]') && cur.getAttribute?.('data-plan-path')) return cur;
          if (p.includes('[data-session-id]') && cur.getAttribute?.('data-session-id')) return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    },
  };
  return el;
}

test('handleDelegatedClick switches tab when tab button is clicked', () => {
  const state = createMockState();
  let rendered = false;
  const tabBtn = createMockEl({ className: 'tab-btn', attrs: { 'data-tab': 'sidebar' } });
  const handled = handleDelegatedClick(tabBtn, state, { onRender: () => { rendered = true; } } as any);
  assert.equal(handled, true);
  assert.equal(state.activeTab, 'sidebar');
  assert.equal(rendered, true);
});

test('handleDelegatedClick selects session when session card is clicked', () => {
  const state = createMockState();
  let selectedId = '';
  const card = createMockEl({ className: 'session-card', attrs: { 'data-session-id': 'sess-99' } });
  const handled = handleDelegatedClick(card, state, { onSelectSession: (id: string) => { selectedId = id; } } as any);
  assert.equal(handled, true);
  assert.equal(selectedId, 'sess-99');
});

test('handleDelegatedClick toggles expanded class on activity-toggle', () => {
  const state = createMockState();
  const toggleCard = createMockEl({ className: 'activity-toggle' });
  const toggleHeader = createMockEl({ className: 'activity-toggle-header', parent: toggleCard });
  const handled = handleDelegatedClick(toggleHeader, state, {} as any);
  assert.equal(handled, true);
  assert.equal(toggleCard.classList.contains('expanded'), true);
});

test('handleDelegatedClick triggers plan build action on plan-build-btn', () => {
  const state = createMockState();
  let builtPath = '', builtTitle = '';
  const btn = createMockEl({
    className: 'plan-build-btn',
    attrs: { 'data-plan-path': '.agent/plans/auth.plan.md', 'data-plan-title': 'Auth Plan' },
  });
  const handled = handleDelegatedClick(btn, state, {
    onBuildPlan: (p: string, t: string) => { builtPath = p; builtTitle = t; },
  } as any);
  assert.equal(handled, true);
  assert.equal(builtPath, '.agent/plans/auth.plan.md');
  assert.equal(builtTitle, 'Auth Plan');
});

test('handleDelegatedClick cycles composerMode on btn-mode-toggle', () => {
  const state = createMockState();
  state.composerMode = 'agent';
  let rendered = false;
  const btn = createMockEl({ id: 'btn-mode-toggle' });
  handleDelegatedClick(btn, state, { onRender: () => { rendered = true; } } as any);
  assert.equal(state.composerMode, 'plan');
  handleDelegatedClick(btn, state, { onRender: () => { rendered = true; } } as any);
  assert.equal(state.composerMode, 'ask');
  handleDelegatedClick(btn, state, { onRender: () => { rendered = true; } } as any);
  assert.equal(state.composerMode, 'agent');
  assert.equal(rendered, true);
});
