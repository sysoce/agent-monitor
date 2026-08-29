export interface HostPollContext {
  isGenerating?: boolean;
  lastActivityAt?: number;
  remainingQuota?: number;
}

export interface ClientPollContext {
  isAwaitingResponse?: boolean;
  awaitingStartedAt?: number;
  isHidden?: boolean;
  remainingQuota?: number;
}

export const HOST_POLL_INTERVALS = {
  ACTIVE_MS: 8_000,
  IDLE_MS: 20_000,
  DEEP_IDLE_MS: 60_000,
  LOW_QUOTA_MS: 60_000,
  CRITICAL_QUOTA_MS: 120_000,
} as const;

export const CLIENT_POLL_INTERVALS = {
  ACTIVE_AWAITING_MS: 6_000,
  FOREGROUND_IDLE_MS: 15_000,
  BACKGROUND_MS: 45_000,
  LOW_QUOTA_MS: 45_000,
  AWAITING_TIMEOUT_MS: 90_000,
} as const;

export function computeHostPollInterval(ctx: HostPollContext): number {
  const { isGenerating, lastActivityAt, remainingQuota } = ctx;

  if (typeof remainingQuota === 'number') {
    if (remainingQuota < 30) return HOST_POLL_INTERVALS.CRITICAL_QUOTA_MS;
    if (remainingQuota < 100) return HOST_POLL_INTERVALS.LOW_QUOTA_MS;
  }

  if (isGenerating) return HOST_POLL_INTERVALS.ACTIVE_MS;

  const idleDuration = lastActivityAt ? Date.now() - lastActivityAt : Infinity;
  if (idleDuration < 60_000) return HOST_POLL_INTERVALS.ACTIVE_MS;
  if (idleDuration < 180_000) return HOST_POLL_INTERVALS.IDLE_MS;

  return HOST_POLL_INTERVALS.DEEP_IDLE_MS;
}

export function computeClientPollInterval(ctx: ClientPollContext): number {
  const { isAwaitingResponse, awaitingStartedAt, isHidden, remainingQuota } = ctx;

  if (typeof remainingQuota === 'number' && remainingQuota < 50) {
    return CLIENT_POLL_INTERVALS.LOW_QUOTA_MS;
  }

  if (isHidden) {
    return CLIENT_POLL_INTERVALS.BACKGROUND_MS;
  }

  if (isAwaitingResponse) {
    const elapsed = awaitingStartedAt ? Date.now() - awaitingStartedAt : 0;
    if (elapsed < CLIENT_POLL_INTERVALS.AWAITING_TIMEOUT_MS) {
      return CLIENT_POLL_INTERVALS.ACTIVE_AWAITING_MS;
    }
  }

  return CLIENT_POLL_INTERVALS.FOREGROUND_IDLE_MS;
}
