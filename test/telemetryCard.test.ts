import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderTelemetryCard, formatTelemetrySpeed, type TelemetryData } from '../src/ui/components/telemetryCard';

test('TelemetryCard renders streaming metrics correctly', () => {
  const data: TelemetryData = {
    tokensPerSecond: 42.5,
    inputTokensPerSecond: 120.0,
    contextUsed: 3500,
    contextMax: 32768,
    streaming: true,
  };

  const html = renderTelemetryCard(data);
  assert.ok(html.includes('42.5 tps') || html.includes('42.5 tok/s') || html.includes('42.5'));
  assert.ok(html.includes('3.5k') || html.includes('3,500') || html.includes('3500'));
  assert.ok(html.includes('telemetry-card'));
});

test('TelemetryCard formats idle state with context only', () => {
  const data: TelemetryData = {
    contextUsed: 1200,
    contextMax: 16000,
    streaming: false,
  };

  const html = renderTelemetryCard(data);
  assert.ok(html.includes('telemetry-card'));
  assert.ok(html.includes('1.2k') || html.includes('1200'));
});

test('formatTelemetrySpeed formats tps and prompt speed cleanly', () => {
  assert.equal(formatTelemetrySpeed(null), null);
  assert.equal(formatTelemetrySpeed(50.2), '50.2 tok/s');
});
