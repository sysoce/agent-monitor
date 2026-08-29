export function isPlanFilePath(filePath: string): boolean {
  const norm = filePath.toLowerCase().replace(/\\/g, '/');
  const isMd = norm.endsWith('.md') || norm.endsWith('.markdown');
  if (!isMd) return false;
  return (
    norm.endsWith('.plan.md') ||
    norm.includes('.agent/plans/') ||
    norm.includes('/plans/') ||
    norm.startsWith('plans/') ||
    norm.endsWith('plan.md')
  );
}
