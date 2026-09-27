import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { readAgentCoreMeta } from '../src/server/coreProxy';

test('readAgentCoreMeta returns null when server.json missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mon-core-'));
  assert.equal(readAgentCoreMeta(dir), null);
});

test('readAgentCoreMeta parses host port url from server.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mon-core-'));
  const agentDir = path.join(dir, '.agent');
  fs.mkdirSync(agentDir);
  fs.writeFileSync(
    path.join(agentDir, 'server.json'),
    JSON.stringify({ host: '127.0.0.1', port: 9876, pid: 42 }),
    'utf8'
  );
  const meta = readAgentCoreMeta(dir);
  assert.ok(meta);
  assert.equal(meta!.port, 9876);
  assert.equal(meta!.host, '127.0.0.1');
  assert.match(meta!.url, /9876/);
  assert.match(meta!.wsUrl, /9876/);
});
