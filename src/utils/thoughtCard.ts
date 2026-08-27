export function formatThoughtDuration(seconds?: number): string {
  if (seconds == null || Number.isNaN(seconds)) return 'briefly';
  if (seconds < 1) return 'briefly';
  return `${Math.round(seconds)}s`;
}
