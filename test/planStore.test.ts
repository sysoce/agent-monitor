import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { listPlans, getPlan, extractSessionPlans } from '../src/server/planStore';

describe('Monitor planStore', () => {
  it('returns empty list when plans directory is missing', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'plan-store-none-'));
    try {
      const plans = await listPlans(tmp);
      assert.deepEqual(plans, []);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it('lists plans and reads plan content', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'plan-store-list-'));
    try {
      const plansDir = path.join(tmp, '.agent', 'plans');
      await fs.mkdir(plansDir, { recursive: true });
      await fs.writeFile(
        path.join(plansDir, 'migration.plan.md'),
        '# Database Migration Plan\n\n1. Add column\n2. Run migration\n'
      );

      const plans = await listPlans(tmp);
      assert.equal(plans.length, 1);
      assert.equal(plans[0]?.name, 'migration.plan.md');
      assert.equal(plans[0]?.title, 'Database Migration Plan');

      const detail = await getPlan(tmp, 'migration.plan.md');
      assert.ok(detail);
      assert.equal(detail.title, 'Database Migration Plan');
      assert.match(detail.content, /Run migration/);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it('extracts plans referenced in session tool calls and messages', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'plan-store-extract-'));
    try {
      const plansDir = path.join(tmp, '.agent', 'plans');
      await fs.mkdir(plansDir, { recursive: true });
      await fs.writeFile(
        path.join(plansDir, 'auth_refactor.plan.md'),
        '# Auth Refactor Plan\n\n- [x] Done\n'
      );

      const docsDir = path.join(tmp, 'docs');
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, 'custom.plan.md'),
        '# Custom Plan\n\nStep 1\n'
      );

      const messages = [
        {
          role: 'assistant' as const,
          content: 'Here is the plan: docs/custom.plan.md',
          tool_calls: [
            {
              id: 'c1',
              name: 'write_file',
              args: { target_file: '.agent/plans/auth_refactor.plan.md' },
            },
          ],
        },
      ];

      const sessionPlans = await extractSessionPlans(tmp, messages);
      assert.equal(sessionPlans.length, 2);
      assert.ok(sessionPlans.some((p: { name: string }) => p.name === 'auth_refactor.plan.md'));
      assert.ok(sessionPlans.some((p: { name: string }) => p.name === 'custom.plan.md'));
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
