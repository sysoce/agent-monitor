import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

test('monitor.css defines touch-friendly vertical scrolling for sidebar-view in Sessions tab', () => {
  const cssPath = path.join(process.cwd(), 'src/ui/monitor.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Must have .sidebar-view rule with overflow-y: auto
  assert.match(css, /\.sidebar-view\s*\{[^}]*overflow-y:\s*auto;/);
  // Must have -webkit-overflow-scrolling: touch
  assert.match(css, /\.sidebar-view\s*\{[^}]*-webkit-overflow-scrolling:\s*touch;/);
  // Must have flex: 1 and min-height: 0 to enable flex child scrolling
  assert.match(css, /\.sidebar-view\s*\{[^}]*flex:\s*1/);
  assert.match(css, /\.sidebar-view\s*\{[^}]*min-height:\s*0;/);
});
