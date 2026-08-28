import test from 'node:test';
import * as assert from 'node:assert/strict';
import type { AppState } from '../src/ui/types';
import { renderComposerView } from '../src/ui/components/composerView';

const mockState: AppState = {
  activeTab: 'chat',
  sessions: [],
  plans: [],
  syncStatus: 'connected',
  searchQuery: '',
  composerMode: 'agent',
  selectedModel: 'antigravity|gemini-3.7-flash-high|model',
  availableModels: [
    { id: 'antigravity|gemini-3.7-flash-high|model', label: 'Gemini 3.7 Flash', provider: 'Antigravity' },
  ],
  isSending: false,
  isAuthenticated: true,
};

test('renderComposerView aligns button classes without conflicting model-pill on toggle button', () => {
  const html = renderComposerView(mockState);

  // Verify attachment button has composer-icon-btn class and id btn-mention-trigger
  assert.match(html, /id="btn-mention-trigger"/);
  assert.match(html, /class="[^"]*composer-icon-btn[^"]*"/);

  // Verify mode button has composer-pill and mode-picker-btn classes
  assert.match(html, /id="btn-mode-toggle"/);
  assert.match(html, /class="composer-pill mode-picker-btn mode-pill mode-pill--agent"/);

  // Verify model toggle button has composer-pill and model-picker-btn classes but NOT the badge class model-pill
  assert.match(html, /id="btn-model-toggle"/);
  assert.match(html, /class="composer-pill model-picker-btn"/);
  assert.doesNotMatch(html, /id="btn-model-toggle"[^>]*class="[^"]*\bmodel-pill\b/);
  assert.doesNotMatch(html, /class="[^"]*\bmodel-pill\b"[^>]*id="btn-model-toggle"/);

  // Verify both mode and model buttons include uniform mode-picker-chevron
  const chevronMatches = html.match(/class="mode-picker-chevron"/g);
  assert.equal(chevronMatches?.length, 2);
});
