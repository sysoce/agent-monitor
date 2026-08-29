export function formatThoughtDuration(seconds?: number): string {
  if (seconds == null || Number.isNaN(seconds)) return 'briefly';
  if (seconds < 1) return 'briefly';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

