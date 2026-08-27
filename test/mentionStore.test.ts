import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { queryWorkspaceMentions } from '../src/server/mentionStore';

test('queryWorkspaceMentions returns workspace files and folders without problems or git', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mention-store-test-'));
  try {
    await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'src', 'index.ts'), 'console.log("hello");\n');
    await fs.writeFile(path.join(tmpDir, 'README.md'), '# Test\n');

    const results = await queryWorkspaceMentions(tmpDir, '');
    assert.ok(results.length > 0);
    const hasProblems = results.some((r) => r.type === 'problems' || r.label.includes('problems'));
    const hasGit = results.some((r) => r.type === 'git' || r.label.includes('git'));
    assert.strictEqual(hasProblems, false, 'Expected no problems suggestion');
    assert.strictEqual(hasGit, false, 'Expected no git suggestion');

    const srcResults = await queryWorkspaceMentions(tmpDir, 'src');
    const hasSrc = srcResults.some((r) => r.label.includes('src'));
    assert.ok(hasSrc, 'Expected suggestions to include src');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
