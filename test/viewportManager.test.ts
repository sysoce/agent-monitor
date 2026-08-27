import { test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  initViewportManager,
  scrollChatToBottom,
  bindComposerKeyboardScroll,
  updateViewportCssVariable,
} from '../src/ui/viewportManager';

let originalWindow: any;
let originalDocument: any;

beforeEach(() => {
  originalWindow = (globalThis as any).window;
  originalDocument = (globalThis as any).document;
});

afterEach(() => {
  (globalThis as any).window = originalWindow;
  (globalThis as any).document = originalDocument;
});

test('updateViewportCssVariable sets --app-height based on visualViewport height', () => {
  const cssVars = new Map<string, string>();
  (globalThis as any).document = {
    documentElement: {
      style: {
        setProperty: (name: string, val: string) => cssVars.set(name, val),
      },
    },
  };
  (globalThis as any).window = {
    visualViewport: {
      height: 540,
    },
    scrollY: 0,
    scrollTo: () => {},
  };

  updateViewportCssVariable();
  assert.equal(cssVars.get('--app-height'), '540px');
});

test('updateViewportCssVariable resets window.scrollY to 0 if body is scrolled', () => {
  let scrolledToX = -1;
  let scrolledToY = -1;
  (globalThis as any).document = {
    documentElement: {
      style: {
        setProperty: () => {},
      },
    },
  };
  (globalThis as any).window = {
    visualViewport: {
      height: 600,
    },
    scrollY: 150,
    scrollTo: (x: number, y: number) => {
      scrolledToX = x;
      scrolledToY = y;
    },
  };

  updateViewportCssVariable();
  assert.equal(scrolledToX, 0);
  assert.equal(scrolledToY, 0);
});

test('scrollChatToBottom scrolls chat messages container to scrollHeight', () => {
  let scrollTopVal = 0;
  const mockContainer = {
    scrollHeight: 1200,
    clientHeight: 400,
    get scrollTop() {
      return scrollTopVal;
    },
    set scrollTop(v: number) {
      scrollTopVal = v;
    },
    scrollTo: (opts: { top: number }) => {
      scrollTopVal = opts.top;
    },
  };

  (globalThis as any).document = {
    getElementById: (id: string) => (id === 'chat-messages-container' ? mockContainer : null),
  };

  scrollChatToBottom(false);
  assert.equal(scrollTopVal, 1200);

  scrollTopVal = 100;
  scrollChatToBottom(true);
  assert.equal(scrollTopVal, 1200);
});

test('bindComposerKeyboardScroll triggers scroll on focus and click', () => {
  let scrollTopVal = 0;
  const mockContainer = {
    scrollHeight: 800,
    clientHeight: 300,
    get scrollTop() {
      return scrollTopVal;
    },
    set scrollTop(v: number) {
      scrollTopVal = v;
    },
  };

  const listeners = new Map<string, Array<() => void>>();
  const mockComposer = {
    addEventListener: (event: string, fn: () => void) => {
      const list = listeners.get(event) || [];
      list.push(fn);
      listeners.set(event, list);
    },
  };

  (globalThis as any).document = {
    getElementById: (id: string) => (id === 'chat-messages-container' ? mockContainer : null),
  };

  bindComposerKeyboardScroll(mockComposer as any);

  assert.equal(listeners.has('focus'), true);
  assert.equal(listeners.has('click'), true);

  // Trigger focus
  const focusHandlers = listeners.get('focus') || [];
  for (const handler of focusHandlers) handler();
  assert.equal(scrollTopVal, 800);

  scrollTopVal = 50;
  // Trigger click
  const clickHandlers = listeners.get('click') || [];
  for (const handler of clickHandlers) handler();
  assert.equal(scrollTopVal, 800);
});
