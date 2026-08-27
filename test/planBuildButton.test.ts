import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderChatView } from '../src/ui/components/chatView';
import { renderPlanView } from '../src/ui/components/planView';
import { buildPlanHandoffPrompt, submitMessageFlow } from '../src/ui/messageSender';
import type { AppState } from '../src/ui/types';

test('renderChatView renders Build button in chat-plan-header when activePlan is present', () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [],
    plans: [],
    activePlanName: 'auth.plan.md',
    activePlan: {
      name: 'auth.plan.md',
      title: 'Authentication Plan',
      path: 'docs/auth.plan.md',
      updatedAt: 1000,
      sizeBytes: 100,
      content: '# Auth Plan\n\n- [ ] Step 1',
    },
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const html = renderChatView(state);
  assert.match(html, /plan-build-btn/);
  assert.match(html, /data-plan-path="docs\/auth\.plan\.md"/);
  assert.match(html, /data-plan-title="Authentication Plan"/);
});

test('renderPlanView renders Build button in plan-meta-header', () => {
  const state: AppState = {
    activeTab: 'plans',
    sessions: [],
    plans: [
      {
        name: 'auth.plan.md',
        title: 'Authentication Plan',
        path: 'docs/auth.plan.md',
        updatedAt: 1000,
        sizeBytes: 100,
        content: '# Auth Plan\n\n- [ ] Step 1',
      },
    ],
    activePlanName: 'auth.plan.md',
    activePlan: {
      name: 'auth.plan.md',
      title: 'Authentication Plan',
      path: 'docs/auth.plan.md',
      updatedAt: 1000,
      sizeBytes: 100,
      content: '# Auth Plan\n\n- [ ] Step 1',
    },
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const html = renderPlanView(state);
  assert.match(html, /plan-build-btn/);
  assert.match(html, /data-plan-path="docs\/auth\.plan\.md"/);
  assert.match(html, /data-plan-title="Authentication Plan"/);
});

test('buildPlanHandoffPrompt formats standard implementation handoff prompt', () => {
  const prompt = buildPlanHandoffPrompt('.agent/plans/migration.plan.md', 'Database Migration');
  assert.match(prompt, /I am ready to implement the plan/);
  assert.match(prompt, /\[Database Migration\]\(\.agent\/plans\/migration\.plan\.md\)/);
  assert.match(prompt, /checklist items/);
  assert.match(prompt, /walkthrough\.md/);
});

test('submitMessageFlow resets activePlan and activePlanName to return to chat', async () => {
  const state: AppState = {
    activeTab: 'plans',
    sessions: [],
    plans: [],
    activePlanName: 'test.plan.md',
    activePlan: {
      name: 'test.plan.md',
      title: 'Test Plan',
      path: 'test.plan.md',
      updatedAt: 1,
      sizeBytes: 1,
      content: 'Plan',
    },
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const syncMachine = {
    setAwaitingResponse: () => {},
    pushInboxMessage: async () => {},
  } as any;

  let reloaded = false;
  let rendered = false;

  await submitMessageFlow(
    state,
    syncMachine,
    'New message from user',
    async () => {
      reloaded = true;
    },
    () => {
      rendered = true;
    }
  );

  assert.equal(state.activePlan, undefined);
  assert.equal(state.activePlanName, undefined);
  assert.equal(state.activeTab, 'chat');
  assert.equal(rendered, true);
});

