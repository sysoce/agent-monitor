import { test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { captureFocusState, restoreFocusState, restoreChatScroll, type FocusSnapshot } from '../src/ui/domFocusPreserver';

let originalDocument: any;

beforeEach(() => {
  originalDocument = (globalThis as any).document;
});

afterEach(() => {
  (globalThis as any).document = originalDocument;
});

test('captureFocusState captures active element ID, cursor position, and input value', () => {
  const mockTextarea = {
    id: 'composer-input',
    tagName: 'TEXTAREA',
    value: 'Hello agent, please fix the bug',
    selectionStart: 11,
    selectionEnd: 16,
    scrollTop: 42,
  };

  (globalThis as any).document = {
    activeElement: mockTextarea,
    getElementById: (id: string) => (id === 'composer-input' ? mockTextarea : null),
  };

  const snapshot = captureFocusState();
  assert.equal(snapshot.activeElementId, 'composer-input');
  assert.equal(snapshot.value, 'Hello agent, please fix the bug');
  assert.equal(snapshot.selectionStart, 11);
  assert.equal(snapshot.selectionEnd, 16);
  assert.equal(snapshot.scrollTop, 42);
});

test('restoreFocusState focuses new element and restores selection range and scrollTop', () => {
  let focused = false;
  let rangeStart: number | null = null;
  let rangeEnd: number | null = null;
  let scrollTopVal = 0;

  const newTextarea = {
    id: 'composer-input',
    tagName: 'TEXTAREA',
    value: 'Hello agent, please fix the bug',
    focus: () => { focused = true; },
    setSelectionRange: (start: number, end: number) => {
      rangeStart = start;
      rangeEnd = end;
    },
    get scrollTop() { return scrollTopVal; },
    set scrollTop(v: number) { scrollTopVal = v; },
  };

  (globalThis as any).document = {
    getElementById: (id: string) => (id === 'composer-input' ? newTextarea : null),
  };

  const snapshot: FocusSnapshot = {
    activeElementId: 'composer-input',
    selectionStart: 11,
    selectionEnd: 16,
    value: 'Hello agent, please fix the bug',
    scrollTop: 42,
    chatScrollTop: 100,
    isChatNearBottom: false,
    sidebarScrollTop: null,
    plansScrollTop: null,
  };

  restoreFocusState(snapshot);
  assert.equal(focused, true);
  assert.equal(rangeStart, 11);
  assert.equal(rangeEnd, 16);
  assert.equal(scrollTopVal, 42);
});

test('restoreChatScroll pins to bottom when isChatNearBottom is true', () => {
  let scrollTopVal = 0;
  const mockChatContainer = {
    scrollHeight: 500,
    clientHeight: 200,
    get scrollTop() { return scrollTopVal; },
    set scrollTop(v: number) { scrollTopVal = v; },
  };

  (globalThis as any).document = {
    getElementById: (id: string) => (id === 'chat-messages-container' ? mockChatContainer : null),
  };

  const snapshot: FocusSnapshot = {
    activeElementId: null,
    selectionStart: null,
    selectionEnd: null,
    value: null,
    scrollTop: null,
    chatScrollTop: 100,
    isChatNearBottom: true,
    sidebarScrollTop: null,
    plansScrollTop: null,
  };

  restoreChatScroll(snapshot);
  assert.equal(scrollTopVal, 500, 'Should scroll to bottom when near bottom');
});

test('restoreChatScroll preserves scroll offset when user has scrolled up', () => {
  let scrollTopVal = 0;
  const mockChatContainer = {
    scrollHeight: 1000,
    clientHeight: 200,
    get scrollTop() { return scrollTopVal; },
    set scrollTop(v: number) { scrollTopVal = v; },
  };

  (globalThis as any).document = {
    getElementById: (id: string) => (id === 'chat-messages-container' ? mockChatContainer : null),
  };

  const snapshot: FocusSnapshot = {
    activeElementId: null,
    selectionStart: null,
    selectionEnd: null,
    value: null,
    scrollTop: null,
    chatScrollTop: 120,
    isChatNearBottom: false,
    sidebarScrollTop: null,
    plansScrollTop: null,
  };

  restoreChatScroll(snapshot);
  assert.equal(scrollTopVal, 120, 'Should preserve exact scroll position when scrolled up');
});
