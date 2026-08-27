import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { ChatMessage } from '../types';
import { isPlanFilePath } from '../utils/planExtractor';

export function extractPlanTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1]!.trim() : fallback.replace(/\.plan\.md$/, '').replace(/[-_]/g, ' ');
}

export async function resolvePlanPath(workspaceRoot: string, target: string): Promise<string | null> {
  if (!target) return null;
  const base = path.basename(target);
  if (!isPlanFilePath(target) && !isPlanFilePath(base)) return null;

  const candidates = [
    path.isAbsolute(target) ? target : path.join(workspaceRoot, target),
    path.join(workspaceRoot, 'docs', base),
    path.join(workspaceRoot, 'docs', 'plans', base),
    path.join(workspaceRoot, '.agent', 'plans', base),
    path.join(workspaceRoot, '.cursor', 'plans', base),
    path.join(workspaceRoot, 'plans', base),
    path.join(os.homedir(), '.gemini', 'antigravity', 'brain', base),
  ];

  for (const c of candidates) {
    try {
      const st = await fs.stat(c);
      if (st.isFile()) {
        const rel = path.relative(workspaceRoot, c);
        if (isPlanFilePath(c) || isPlanFilePath(rel) || isPlanFilePath(base)) {
          return c;
        }
      }
    } catch {}
  }

  return null;
}

export function extractToolPlanContent(messages: ChatMessage[], targetName: string, rawPath: string): string {
  if (!isPlanFilePath(targetName) && !isPlanFilePath(rawPath)) return '';
  for (const m of messages) {
    for (const tc of m.tool_calls ?? []) {
      const t = String(tc.args?.target_file || tc.args?.targetFile || tc.args?.path || '');
      if (isPlanFilePath(t) && (t === rawPath || path.basename(t) === targetName)) {
        const text = String(tc.args?.CodeContent || tc.args?.content || tc.args?.code || '');
        if (text) return text;
      }
    }
  }
  return '';
}

