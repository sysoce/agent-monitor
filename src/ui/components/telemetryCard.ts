import { escapeHtml } from './markdown';

export interface TelemetryData {
  tokensPerSecond?: number | null;
  inputTokensPerSecond?: number | null;
  contextUsed?: number;
  contextMax?: number;
  streaming?: boolean;
  activePhase?: string;
  toolDurationMs?: number;
}

export function formatTelemetrySpeed(tps: number | null | undefined): string | null {
  if (tps == null || !Number.isFinite(tps) || tps <= 0) return null;
  return `${tps >= 100 ? Math.round(tps) : tps.toFixed(1)} tok/s`;
}

export function formatTelemetryTokens(count: number | undefined): string {
  if (count == null || !Number.isFinite(count) || count <= 0) return '0';
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1)}k`;
}

export function renderTelemetryCard(data: TelemetryData): string {
  const speed = formatTelemetrySpeed(data.tokensPerSecond);
  const inputSpeed = formatTelemetrySpeed(data.inputTokensPerSecond);
  const used = formatTelemetryTokens(data.contextUsed);
  const max = formatTelemetryTokens(data.contextMax);

  const isStreaming = Boolean(data.streaming);
  const badges: string[] = [];

  if (speed) {
    badges.push(`<span class="telemetry-badge telemetry-speed">⚡ ${escapeHtml(speed)}</span>`);
  }
  if (inputSpeed) {
    badges.push(`<span class="telemetry-badge telemetry-eval">📥 ${escapeHtml(inputSpeed)} eval</span>`);
  }
  if (data.contextUsed != null && data.contextMax != null) {
    badges.push(`<span class="telemetry-badge telemetry-context">🧠 ${used} / ${max} tokens</span>`);
  }
  if (data.activePhase) {
    badges.push(`<span class="telemetry-badge telemetry-phase">⚙️ ${escapeHtml(data.activePhase)}</span>`);
  }

  if (badges.length === 0) return '';

  return `
    <div class="telemetry-card ${isStreaming ? 'telemetry-card--streaming' : ''}">
      <div class="telemetry-badges">
        ${badges.join('')}
      </div>
    </div>
  `;
}
