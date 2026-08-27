export interface ExtractedPlanMeta {
  title: string;
  overview: string;
  path: string;
}

export function isPlanFilePath(filePath: string, content?: string): boolean {
  const norm = filePath.toLowerCase().replace(/\\/g, '/');
  const isMd = norm.endsWith('.md') || norm.endsWith('.markdown');
  if (!isMd) return false;
  if (norm.endsWith('.plan.md')) return true;
  if (norm.includes('.agent/plans/') || norm.includes('/plans/') || norm.startsWith('plans/')) return true;
  const parts = norm.split('/');
  const base = parts[parts.length - 1] || norm;
  if (parts.length === 1 && (
    base === 'plan.md' ||
    base === 'sample_plan.md' ||
    base === 'sample-plan.md' ||
    base === 'implementation_plan.md' ||
    base === 'implementation-plan.md' ||
    base === '_plan.md'
  )) {
    return true;
  }
  if (content) {
    if (/(?:#\s*Subtest:|ok\s+\d+\s*-|1\.\.\d+|duration_ms:)/m.test(content)) return false;
    return /^#\s+([^#\n]*\bPlan\b[^#\n]*)$/im.test(content);
  }
  return false;
}

export function extractPlanMeta(filePath: string, content: string, titleHint?: string, overviewHint?: string): ExtractedPlanMeta {
  let title = (titleHint || '').trim();
  let overview = (overviewHint || '').trim();

  if (!title) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    title = titleMatch ? titleMatch[1].trim() : 'Plan';
  }

  if (!overview) {
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim();
      if (t && !t.startsWith('#') && !t.startsWith('---') && !t.startsWith('```') && !t.startsWith('-') && !t.startsWith('*')) {
        overview = t.slice(0, 200);
        break;
      }
    }
    if (!overview) overview = title;
  }

  return { title, overview, path: filePath };
}
