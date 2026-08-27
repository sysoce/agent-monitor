import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolvePlanPath } from '../src/server/planStore';
import { isPlanFilePath } from '../src/utils/planExtractor';

test('isPlanFilePath returns false for arbitrary repo docs containing plan in name', () => {
  assert.equal(isPlanFilePath('docs/kernel_hardening_implementation_plan.md'), false);
  assert.equal(isPlanFilePath('docs/new_kernel_implementation_plan.md'), false);
  assert.equal(isPlanFilePath('docs/agent_true_north_implementation_plan.md'), false);
  assert.equal(isPlanFilePath('README.md'), false);
  assert.equal(isPlanFilePath('AGENTS.md'), false);
});

test('isPlanFilePath returns true for standard plan locations and extensions', () => {
  assert.equal(isPlanFilePath('.agent/plans/feature.plan.md'), true);
  assert.equal(isPlanFilePath('.agent/plans/feature.md'), true);
  assert.equal(isPlanFilePath('plans/sample-plan.md'), true);
  assert.equal(isPlanFilePath('feature.plan.md'), true);
  assert.equal(isPlanFilePath('plan.md'), true);
  assert.equal(isPlanFilePath('sample_plan.md'), true);
});

test('resolvePlanPath does not resolve plans across arbitrary other session brain directories', async () => {
  const tmpWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-ws-'));
  try {
    // When a plan is requested that does not exist in workspace or explicit target, it returns null
    const resolved = await resolvePlanPath(tmpWorkspace, 'sample_unrelated_session_plan.md');
    assert.equal(resolved, null);
  } finally {
    await fs.rm(tmpWorkspace, { recursive: true, force: true });
  }
});

test('resolvePlanPath returns null for source code files even if existing on disk', async () => {
  const tmpWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-ws-'));
  try {
    await fs.mkdir(path.join(tmpWorkspace, 'src', 'monitor', 'ui'), { recursive: true });
    await fs.writeFile(path.join(tmpWorkspace, 'src', 'monitor', 'ui', 'appController.ts'), 'export class AppController {}', 'utf8');
    await fs.writeFile(path.join(tmpWorkspace, 'appController.ts'), 'export class AppController {}', 'utf8');
    await fs.writeFile(path.join(tmpWorkspace, 'sessionPlanSync.ts'), 'export function sync() {}', 'utf8');

    assert.equal(await resolvePlanPath(tmpWorkspace, 'appController.ts'), null);
    assert.equal(await resolvePlanPath(tmpWorkspace, 'src/monitor/ui/appController.ts'), null);
    assert.equal(await resolvePlanPath(tmpWorkspace, 'sessionPlanSync.ts'), null);
  } finally {
    await fs.rm(tmpWorkspace, { recursive: true, force: true });
  }
});

