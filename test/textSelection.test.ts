import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

test('sidebar.css does not disable text selection globally on body', () => {
  const sidebarCssPath = path.join(process.cwd(), 'src/ui/css/sidebar.css');
  const css = fs.readFileSync(sidebarCssPath, 'utf8');
  assert.doesNotMatch(css, /body\s*\{[^}]*user-select:\s*none/);
});

test('monitor.css sets selectable text for connection notices and error banners', () => {
  const monitorCssPath = path.join(process.cwd(), 'src/ui/monitor.css');
  const css = fs.readFileSync(monitorCssPath, 'utf8');

  assert.match(css, /\.connection-notice[^{]*\{[^}]*user-select:\s*text/);
  assert.match(css, /\.connection-notice[^{]*\{[^}]*-webkit-user-select:\s*text/);
  assert.match(css, /\.connection-notice-content[^{]*\{[^}]*user-select:\s*text/);
  assert.match(css, /\.connection-notice-title[^{]*\{[^}]*user-select:\s*text/);
  assert.match(css, /\.connection-notice-text[^{]*\{[^}]*user-select:\s*text/);
});

test('monitor.css sets selectable text for settings modal and network IP details', () => {
  const monitorCssPath = path.join(process.cwd(), 'src/ui/monitor.css');
  const css = fs.readFileSync(monitorCssPath, 'utf8');

  assert.match(css, /\.settings-modal-body[^{]*\{[^}]*user-select:\s*text/);
  assert.match(css, /\.network-ip-address-text[^{]*\{[^}]*user-select:\s*text/);
  assert.match(css, /\.settings-sync-val[^{]*\{[^}]*user-select:\s*text/);
  assert.match(css, /\.settings-sync-status[^{]*\{[^}]*user-select:\s*text/);
  assert.match(css, /\.settings-version-val[^{]*\{[^}]*user-select:\s*text/);
});

test('monitor.css sets selectable text for chat messages and error cards', () => {
  const monitorCssPath = path.join(process.cwd(), 'src/ui/monitor.css');
  const css = fs.readFileSync(monitorCssPath, 'utf8');

  assert.match(css, /\.msg-error-card[^{]*\{[^}]*user-select:\s*text/);
  assert.match(css, /\.msg-error-body[^{]*\{[^}]*user-select:\s*text/);
  assert.match(css, /\.msg-text[^{]*\{[^}]*user-select:\s*text/);
});
