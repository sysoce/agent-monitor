import test from 'node:test';
import * as assert from 'node:assert/strict';
import { isNewerVersion, parseSemver } from '../src/ui/version';

test('parseSemver parses standard semantic versions', () => {
  assert.deepEqual(parseSemver('2.3.198'), [2, 3, 198]);
  assert.deepEqual(parseSemver('v1.0.0'), [1, 0, 0]);
  assert.deepEqual(parseSemver('0.1.2-beta.1'), [0, 1, 2]);
});

test('isNewerVersion correctly compares versions', () => {
  assert.equal(isNewerVersion('2.3.199', '2.3.198'), true);
  assert.equal(isNewerVersion('2.4.0', '2.3.198'), true);
  assert.equal(isNewerVersion('3.0.0', '2.3.198'), true);
  assert.equal(isNewerVersion('2.3.198', '2.3.198'), false);
  assert.equal(isNewerVersion('2.3.197', '2.3.198'), false);
  assert.equal(isNewerVersion('1.9.99', '2.0.0'), false);
});

test('isNewerVersion handles malformed or missing versions gracefully', () => {
  assert.equal(isNewerVersion('', '2.3.198'), false);
  assert.equal(isNewerVersion('invalid', '2.3.198'), false);
  assert.equal(isNewerVersion('2.3.199', ''), true);
});
