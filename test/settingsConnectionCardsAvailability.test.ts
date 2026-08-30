import test from 'node:test';
import * as assert from 'node:assert/strict';
import {
  renderNetworkConnectionItem,
  type NetworkConnectionItem,
} from '../src/ui/components/settingsModal/settingsConnectionCards';

test('renderNetworkConnectionItem renders normal active and standby badges when available', () => {
  const item: NetworkConnectionItem = {
    name: 'Tailscale VPN',
    url: 'http://100.74.73.50:4200',
    address: '100.74.73.50',
    isTailscale: true,
    isAvailable: true,
  };

  const activeHtml = renderNetworkConnectionItem(
    item,
    'http://100.74.73.50:4200',
    'http://192.168.1.111:4200',
    'test-payload',
    ''
  );
  assert.ok(activeHtml.includes('selected active-connection'), 'Must have active class when selected');
  assert.ok(activeHtml.includes('network-status--active'), 'Must have active status badge');
  assert.ok(!activeHtml.includes('connection-unavailable'), 'Must not have unavailable class');

  const standbyHtml = renderNetworkConnectionItem(
    item,
    'http://192.168.1.111:4200',
    'http://192.168.1.111:4200',
    'test-payload',
    ''
  );
  assert.ok(standbyHtml.includes('inactive-connection'), 'Must have inactive class when not selected');
  assert.ok(standbyHtml.includes('network-status--disabled'), 'Must have disabled/standby status badge');
  assert.ok(!standbyHtml.includes('connection-unavailable'), 'Must not have unavailable class');
});

test('renderNetworkConnectionItem renders greyed-out unavailable card when isAvailable is false', () => {
  const item: NetworkConnectionItem = {
    name: 'Tailscale VPN',
    url: 'http://100.74.73.50:4200',
    address: '100.74.73.50',
    isTailscale: true,
    isAvailable: false,
  };

  const html = renderNetworkConnectionItem(
    item,
    'http://192.168.1.111:4200',
    'http://192.168.1.111:4200',
    'test-payload',
    ''
  );
  assert.ok(html.includes('connection-unavailable'), 'Must include connection-unavailable class when isAvailable is false');
  assert.ok(html.includes('network-status--unavailable'), 'Must render network-status--unavailable status badge');
  assert.ok(html.includes('Unavailable'), 'Must render Unavailable text in badge');
  assert.ok(html.includes('aria-disabled="true"'), 'Must set aria-disabled="true"');
});

test('renderNetworkConnectionItem renders remove button for custom connections', () => {
  const item: NetworkConnectionItem = {
    name: 'Custom Office PC',
    url: 'http://10.0.0.99:4200',
    address: '10.0.0.99',
    isCustom: true,
    isAvailable: true,
  };

  const html = renderNetworkConnectionItem(
    item,
    'http://192.168.1.111:4200',
    'http://192.168.1.111:4200',
    'test-payload',
    ''
  );
  assert.ok(html.includes('data-delete-custom-ip="http://10.0.0.99:4200"'), 'Must render data-delete-custom-ip attribute');
  assert.ok(html.includes('network-btn-delete'), 'Must render network-btn-delete class');
});
