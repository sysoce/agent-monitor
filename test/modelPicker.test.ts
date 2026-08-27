import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { formatModelLabel } from '../src/utils/modelCatalogPresets';
import { getMonitorModelCatalog, MONITOR_MODEL_GROUPS } from '../src/server/modelsCatalog';
import { renderModelPickerDropdown } from '../src/ui/components/modelPickerDropdown';
import { renderComposerView } from '../src/ui/components/composerView';
import type { AppState } from '../src/ui/types';

describe('Model Catalog & Label Formatting', () => {
  it('formatModelLabel formats known providers and models cleanly', () => {
    assert.strictEqual(formatModelLabel('antigravity|gemini-3.7-flash-high|model'), 'Gemini 3.7 Flash');
    assert.strictEqual(formatModelLabel('antigravity|gemini-2.5-pro|model'), 'Gemini 2.5 Pro');
    assert.strictEqual(formatModelLabel('cursor|auto|model'), 'Cursor Auto');
    assert.strictEqual(formatModelLabel('cursor|composer-2.5|model'), 'Cursor Composer 2.5');
    assert.strictEqual(formatModelLabel('anthropic|claude-3-7-sonnet|model'), 'Claude 3.7 Sonnet');
    assert.strictEqual(formatModelLabel('anthropic|claude-3-5-sonnet|model'), 'Claude 3.5 Sonnet');
    assert.strictEqual(formatModelLabel('openai|gpt-4o|model'), 'OpenAI: GPT-4o');
    assert.strictEqual(formatModelLabel('gemini|gemini-3.7-flash|model'), 'Gemini: gemini-3.7-flash');
    assert.strictEqual(formatModelLabel('ollama|mannix/qwen3.6-27b-a3b-coderx:latest|model'), 'Ollama: mannix/qwen3.6-27b-a3b-coderx:latest');
  });

  it('formatModelLabel returns match label if model exists in catalog', () => {
    const custom = [{ id: 'custom|my-model|cli', label: 'My Custom Model', provider: 'custom' }];
    assert.strictEqual(formatModelLabel('custom|my-model|cli', custom), 'My Custom Model');
  });

  it('getMonitorModelCatalog returns grouped models including Antigravity, Cursor, Anthropic, OpenAI, Gemini, Puter, Ollama', () => {
    const catalog = getMonitorModelCatalog();
    assert.ok(catalog.groups.length >= 7);
    const groupLabels = catalog.groups.map((g) => g.label);
    assert.ok(groupLabels.some((l) => l.includes('Antigravity')));
    assert.ok(groupLabels.some((l) => l.includes('Cursor')));
    assert.ok(groupLabels.some((l) => l.includes('Anthropic')));
    assert.ok(groupLabels.some((l) => l.includes('OpenAI')));
    assert.ok(groupLabels.some((l) => l.includes('Gemini')));
    assert.ok(groupLabels.some((l) => l.includes('Puter')));
    assert.ok(groupLabels.some((l) => l.includes('Ollama')));
    assert.ok(catalog.models.length >= 20);
  });
});

describe('Model Picker Dropdown UI', () => {
  const baseState: AppState = {
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
    isModelPickerOpen: true,
  };

  it('renders search input, groups, checkmark, and capability pills', () => {
    const html = renderModelPickerDropdown(baseState);
    assert.ok(html.includes('id="model-search-input"'));
    assert.ok(html.includes('class="model-menu-group"'));
    assert.ok(html.includes('Google Antigravity'));
    assert.ok(html.includes('Cursor (IDE Bridge)'));
    assert.ok(html.includes('class="model-item-check"'));
    assert.ok(html.includes('✓'));
    assert.ok(html.includes('model-pill-reasoning'));
    assert.ok(html.includes('model-pill-vision'));
  });

  it('filters models when search query is entered', () => {
    const filteredState: AppState = {
      ...baseState,
      modelSearchQuery: 'Claude',
    };
    const html = renderModelPickerDropdown(filteredState);
    assert.ok(html.includes('Claude 3.7 Sonnet'));
    assert.ok(!html.includes('Cursor Auto'));
  });

  it('renders empty message when no models match search', () => {
    const emptyState: AppState = {
      ...baseState,
      modelSearchQuery: 'nonexistent-model-xyz',
    };
    const html = renderModelPickerDropdown(emptyState);
    assert.ok(html.includes('No matching models found'));
  });

  it('renderComposerView renders model picker dropdown when isModelPickerOpen is true', () => {
    const html = renderComposerView(baseState);
    assert.ok(html.includes('id="model-picker-menu"'));
    assert.ok(html.includes('id="model-search-input"'));
    assert.ok(html.includes('Gemini 3.7 Flash'));
  });
});
