import test from 'node:test';
import * as assert from 'node:assert/strict';
import { extractSessionPlans } from '../src/server/planStore';
import type { ChatMessage } from '../src/types';

test('extractSessionPlans ignores non-markdown tool calls under plans directory', async () => {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: 'Create a sample plan',
    },
    {
      role: 'assistant',
      content: 'Creating plan',
      tool_calls: [
        {
          id: 'call-1',
          name: 'write_file',
          args: {
            path: 'plans/sample-plan.md',
            content: '# Sample Plan\n\n- [ ] Step 1',
          },
        },
      ],
    },
    {
      role: 'assistant',
      content: 'Creating scratch test',
      tool_calls: [
        {
          id: 'call-2',
          name: 'write_file',
          args: {
            path: 'plans/sample-plan/scratch/sample-feature.test.ts',
            content: 'import test from "node:test";',
          },
        },
      ],
    },
  ];

  const plans = await extractSessionPlans('/fake/root', messages);
  assert.equal(plans.length, 1);
  assert.equal(plans[0]?.name, 'sample-plan.md');
  assert.equal(plans[0]?.title, 'Sample Plan');
});

test('extractSessionPlans ignores source files mentioned in prose text', async () => {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: 'Hello, I am testing the Monitor Agent app.',
    },
    {
      role: 'assistant',
      content:
        'Here are a few areas we can inspect:\n' +
        '- UI & State Controllers: appController.ts, entry.ts, sessionPlanSync.ts\n' +
        '- Unit & Integration Tests: chatActivityFormatting.test.ts',
    },
  ];

  const plans = await extractSessionPlans('/fake/root', messages);
  assert.equal(plans.length, 0);
});

