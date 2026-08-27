import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { MentionSuggestionItem } from '../types';

function scoreMatch(name: string, relPath: string, q: string): number {
  if (!q) {
    const depth = relPath.split('/').length;
    return Math.max(1, 10 - depth);
  }
  const lowerName = name.toLowerCase();
  const lowerPath = relPath.toLowerCase();

  if (lowerPath === q) return 100;
  if (lowerName === q) return 95;

  if (lowerPath.startsWith(q)) {
    const remaining = lowerPath.slice(q.length);
    const extraDepth = remaining.split('/').filter(Boolean).length;
    return 80 - extraDepth * 2;
  }

  if (lowerName.startsWith(q)) return 70;

  if (q.includes('/')) {
    const lastSlash = q.lastIndexOf('/');
    const dirPrefix = q.slice(0, lastSlash + 1);
    const term = q.slice(lastSlash + 1);
    if (dirPrefix && lowerPath.startsWith(dirPrefix)) {
      if (!term) return 75;
      if (lowerName.startsWith(term)) return 70;
      if (lowerName.includes(term)) return 55;
      if (lowerPath.slice(dirPrefix.length).includes(term)) return 45;
    }
  }

  if (lowerName.includes(q)) return 40;
  if (lowerPath.includes(q)) return 20;
  return 0;
}

export async function queryWorkspaceMentions(
  workspaceRoot: string,
  query: string
): Promise<MentionSuggestionItem[]> {
  const rawQ = query.toLowerCase().replace(/^@/, '').replace(/\\/g, '/').trim();
  const q = rawQ.replace(/^\/+/, '');
  const collected: Array<{ item: MentionSuggestionItem; score: number }> = [];

  const walk = async (dir: string, depth = 0): Promise<void> => {
    if (depth > 4) return;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'dist-test'
        ) {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        const rel = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/');
        const isDir = entry.isDirectory();

        const score = scoreMatch(entry.name, rel, q);
        if (score > 0 || !q) {
          collected.push({
            score: score + (isDir ? 5 : 0),
            item: {
              type: isDir ? 'folder' : 'file',
              label: `${rel}${isDir ? '/' : ''}`,
              detail: '',
            },
          });
        }

        if (isDir) {
          await walk(fullPath, depth + 1);
        }
      }
    } catch {
      // Skip unreadable dirs
    }
  };

  await walk(workspaceRoot);
  collected.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));
  return collected.slice(0, 30).map((c) => c.item);
}
