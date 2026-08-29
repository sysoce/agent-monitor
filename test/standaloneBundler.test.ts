import test from 'node:test';
import * as assert from 'node:assert/strict';
import { buildStandaloneHtml } from '../src/setup/standaloneTemplate';

test('buildStandaloneHtml preserves regex replacement tokens ($1, $2, $$) in bundled js', () => {
  const sampleJs = `
    const x = text.replace(/(\\w+)/g, '<code class="inline-code">$1</code>');
    const y = text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    const z = text.replace(/\\$\\$/g, '$$');
  `;
  const sampleHtml = `<!DOCTYPE html><html><head><link rel="stylesheet" href="/monitor.css" /></head><body><script src="/bundle.js"></script></body></html>`;

  const output = buildStandaloneHtml({
    html: sampleHtml,
    css: 'body { color: red; }',
    js: sampleJs,
  });

  assert.ok(output.includes('<code class="inline-code">$1</code>'), 'Must preserve $1 in code replacement');
  assert.ok(output.includes('<strong>$1</strong>'), 'Must preserve $1 in strong replacement');
  assert.ok(output.includes("replace(/\\$\\$/g, '$$')"), 'Must preserve $$ in regex replacement');
  assert.ok(!output.includes('<code class="inline-code"></code>'), 'Must not strip $1 to empty code tag');
  assert.ok(!output.includes('<strong></strong>'), 'Must not strip $1 to empty strong tag');
});
