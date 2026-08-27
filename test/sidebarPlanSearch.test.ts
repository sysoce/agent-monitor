import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderPlanView } from '../src/ui/components/planView';
import { renderSidebarView } from '../src/ui/components/sidebarView';
import type { AppState } from '../src/ui/types';

test('renderPlanView does not render plan selector dropdown', () => {
  const state: AppState = {
    activeTab: 'plans',
    sessions: [],
    plans: [
      { name: 'auth.plan.md', title: 'Auth Plan', path: 'docs/auth.plan.md', updatedAt: 1000, sizeBytes: 100, content: '# Auth Plan\n\n- [x] Step 1' },
    ],
    activePlanName: 'auth.plan.md',
    activePlan: { name: 'auth.plan.md', title: 'Auth Plan', path: 'docs/auth.plan.md', updatedAt: 1000, sizeBytes: 100, content: '# Auth Plan\n\n- [x] Step 1' },
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const html = renderPlanView(state);
  assert.equal(html.includes('plan-select'), false, 'Should not contain plan-select element');
  assert.equal(html.includes('plan-selector-bar'), false, 'Should not contain plan-selector-bar element');
  assert.match(html, /Auth Plan/);
});

test('renderSidebarView shows session plans on session card', () => {
  const state: AppState = {
    activeTab: 'sidebar',
    sessions: [
      {
        id: 'sess-1',
        title: 'Fix auth',
        updatedAt: Date.now() - 60000,
        createdAt: Date.now() - 120000,
        messageCount: 5,
        preview: 'Working on auth plan',
        plans: [{ name: 'auth.plan.md', title: 'Authentication Architecture', path: 'docs/auth.plan.md' }],
        artifacts: [{ name: 'token_spec.md', path: 'docs/token_spec.md' }],
      },
    ],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const html = renderSidebarView(state);
  assert.match(html, /Authentication Architecture/);
  assert.match(html, /data-plan-path="docs\/auth\.plan\.md"/);
});

test('renderSidebarView allows searching by plan or artifact name across session history', () => {
  const state: AppState = {
    activeTab: 'sidebar',
    sessions: [
      {
        id: 'sess-1',
        title: 'Session Alpha',
        updatedAt: Date.now() - 60000,
        createdAt: Date.now() - 120000,
        messageCount: 5,
        preview: 'Regular chat',
        plans: [{ name: 'migration.plan.md', title: 'Database Migration Plan', path: '.agent/plans/migration.plan.md' }],
        artifacts: [],
      },
      {
        id: 'sess-2',
        title: 'Session Beta',
        updatedAt: Date.now() - 60000,
        createdAt: Date.now() - 120000,
        messageCount: 3,
        preview: 'Other chat',
        plans: [],
        artifacts: [{ name: 'architecture_diagram.png', path: 'artifacts/architecture_diagram.png' }],
      },
    ],
    plans: [],
    syncStatus: 'connected',
    searchQuery: 'migration',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const html = renderSidebarView(state);
  assert.match(html, /Session Alpha/);
  assert.doesNotMatch(html, /Session Beta/);

  const artifactSearchHtml = renderSidebarView({ ...state, searchQuery: 'diagram' });
  assert.match(artifactSearchHtml, /Session Beta/);
  assert.doesNotMatch(artifactSearchHtml, /Session Alpha/);
});
