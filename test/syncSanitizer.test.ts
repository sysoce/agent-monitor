import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { sanitizeSessionForSync } from '../src/sync/syncSanitizer';

describe('sanitizeSessionForSync', () => {
  it('omits tool call result payloads and truncates verbose code args for lightweight sync', () => {
    const rawDetail = {
      id: 'sess-test',
      title: 'Test Session',
      messages: [
        {
          role: 'user',
          content: 'Inspect the codebase',
        },
        {
          role: 'assistant',
          content: 'Here are the findings...',
          thought: 'Deep reasoning text...',
          tool_calls: [
            {
              id: 'tc-1',
              name: 'read_file',
              args: {
                path: 'src/heavy.ts',
                start_line: 1,
                end_line: 100,
              },
              result: 'A'.repeat(50000), // Massive file read payload
            },
            {
              id: 'tc-2',
              name: 'write_file',
              args: {
                targetFile: 'src/output.ts',
                CodeContent: 'export const heavy = "' + 'B'.repeat(10000) + '";',
              },
              result: { success: true },
            },
          ],
        },
      ],
    };

    const sanitized = sanitizeSessionForSync(rawDetail);

    assert.equal(sanitized.id, 'sess-test');
    assert.equal(sanitized.messages.length, 2);

    const asstMsg = sanitized.messages[1];
    assert.equal(asstMsg.tool_calls.length, 2);

    // Tool 1: result is stripped
    assert.equal(asstMsg.tool_calls[0].result, undefined);
    assert.equal(asstMsg.tool_calls[0].args.path, 'src/heavy.ts');
    assert.equal(asstMsg.tool_calls[0].args.start_line, 1);

    // Tool 2: result is stripped and CodeContent is trimmed
    assert.equal(asstMsg.tool_calls[1].result, undefined);
    assert.equal(asstMsg.tool_calls[1].args.targetFile, 'src/output.ts');
    assert.ok(asstMsg.tool_calls[1].args.CodeContent.length <= 250);
  });
});
