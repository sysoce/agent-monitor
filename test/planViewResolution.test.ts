import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolvePlanPath, getPlan, extractSessionPlans } from '../src/server/planStore';
import { selectPlanDetail, syncSessionPlans } from '../src/ui/sessionPlanSync';
import { renderPlanView } from '../src/ui/components/planView';
import type { AppState } from '../src/ui/types';

test('resolvePlanPath resolves plans in docs/ folder', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-plan-docs-'));
  try {
    const docsDir = path.join(tmpDir, 'docs');
    await fs.mkdir(docsDir, { recursive: true });
    await fs.writeFile(path.join(docsDir, 'implementation_plan.md'), '# Implementation Plan\n\n- [ ] Step 1');

    const resolved = await resolvePlanPath(tmpDir, 'implementation_plan.md');
    assert.ok(resolved);
    assert.equal(path.basename(resolved), 'implementation_plan.md');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('extractSessionPlans extracts content from tool calls when file is not on disk', async () => {
  const messages: any[] = [
    {
      role: 'assistant',
      content: 'I created sample_plan.md',
      tool_calls: [
        {
          id: 'tc-1',
          name: 'write_file',
          args: {
            target_file: 'sample_plan.md',
            content: '# Sample Plan\n\n## Action Items\n- [x] Task 1\n- [ ] Task 2',
          },
        },
      ],
    },
  ];

  const summaries = await extractSessionPlans('/non/existent/root', messages);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.name, 'sample_plan.md');
  assert.equal(summaries[0]?.title, 'Sample Plan');
  assert.ok(summaries[0]?.content?.includes('Action Items'));
});

test('selectPlanDetail sets activePlan and keeps activeTab in chat', async () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [],
    activeSessionId: 'sess-1',
    activeSession: {
      id: 'sess-1',
      title: 'Create sample plan',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [
        {
          role: 'assistant',
          content: 'Here is sample_plan.md',
          tool_calls: [
            {
              id: 'tc-1',
              name: 'write_file',
              args: {
                target_file: 'sample_plan.md',
                content: '# Feature Implementation Plan\n\n- [x] Done',
              },
            },
          ],
        } as any,
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      plans: [
        {
          name: 'sample_plan.md',
          title: 'Feature Implementation Plan',
          path: 'sample_plan.md',
          updatedAt: 1000,
          sizeBytes: 50,
          content: '# Feature Implementation Plan\n\n- [x] Done',
        },
      ],
    },
    plans: [
      {
        name: 'sample_plan.md',
        title: 'Feature Implementation Plan',
        path: 'sample_plan.md',
        updatedAt: 1000,
        sizeBytes: 50,
        content: '# Feature Implementation Plan\n\n- [x] Done',
      },
    ],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  await selectPlanDetail(state, 'sample_plan.md');
  assert.equal(state.activeTab, 'chat');
  assert.ok(state.activePlan);
  assert.equal(state.activePlan?.name, 'sample_plan.md');
  assert.ok(state.activePlan?.content.includes('Feature Implementation Plan'));

  const viewHtml = renderPlanView(state);
  assert.match(viewHtml, /Feature Implementation Plan/);
  assert.doesNotMatch(viewHtml, /No plans in this session/);
});
