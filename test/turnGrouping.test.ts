import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderChatView } from '../src/ui/components/chatView';
import type { AppState } from '../src/ui/types';

test('renderChatView groups multi-round assistant messages between user prompts into single turn with aggregated thinking', () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [],
    activeSessionId: 'sess-test',
    activeSession: {
      id: 'sess-test',
      title: 'Kernel Architecture Test',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [
        { role: 'user', content: 'Look at the kernel. Show me its structure and architecture.' },
        {
          role: 'assistant',
          content: '',
          thought: 'Round 1 thinking: let us explore repo map',
          tool_calls: [{ id: 'call-1', name: 'repo_map', args: {} }],
        } as any,
        {
          role: 'tool',
          tool_call_id: 'call-1',
          name: 'repo_map',
          content: 'src/kernel/index.ts',
        } as any,
        {
          role: 'assistant',
          content: '',
          thought: 'Round 2 thinking: exploring src/kernel',
          tool_calls: [{ id: 'call-2', name: 'list_dir', args: { path: 'src/kernel' } }],
        } as any,
        {
          role: 'tool',
          tool_call_id: 'call-2',
          name: 'list_dir',
          content: 'Kernel.ts, kernelFactory.ts',
        } as any,
        {
          role: 'assistant',
          content: '',
          thought: 'Round 3 thinking: reading kernel index',
          tool_calls: [{ id: 'call-3', name: 'read_file', args: { path: 'src/kernel/index.ts' } }],
        } as any,
        {
          role: 'tool',
          tool_call_id: 'call-3',
          name: 'read_file',
          content: 'export * from ...',
        } as any,
        {
          role: 'assistant',
          content: 'Here is the complete kernel architecture explanation.',
        } as any,
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'gemini-3.7-flash',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const html = renderChatView(state);

  // Must only contain ONE assistant turn wrapper for this turn
  const assistantTurnMatches = html.match(/class="turn turn-assistant/g);
  assert.equal(assistantTurnMatches?.length, 1, 'Should consolidate multi-round assistant messages into a single turn');

  // Must only contain ONE thought toggle with all thinking combined
  const thoughtMatches = html.match(/activity-toggle--thought/g);
  assert.equal(thoughtMatches?.length, 1, 'Should consolidate thoughts into a single Thought toggle at top');

  // Thought body should contain thoughts from all rounds
  assert.match(html, /Round 1 thinking/);
  assert.match(html, /Round 2 thinking/);
  assert.match(html, /Round 3 thinking/);

  // All 3 tool calls must be present in the turn
  assert.match(html, /Repo map/);
  assert.match(html, /Explored src\/kernel/);
  assert.match(html, /Read src\/kernel\/index\.ts/);

  // Final response text must be present
  assert.match(html, /Here is the complete kernel architecture explanation/);
});
