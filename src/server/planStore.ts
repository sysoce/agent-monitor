import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ChatMessage } from '../types';
import type { PlanDetail, PlanSummary } from './types';
import { extractPlanTitle, resolvePlanPath, extractToolPlanContent } from './planResolver';
import { isPlanFilePath } from '../utils/planExtractor';

export { resolvePlanPath };

export async function listPlans(workspaceRoot: string): Promise<PlanSummary[]> {
  const plansDir = path.join(workspaceRoot, '.agent', 'plans');
  let entries: import('node:fs').Dirent[] = [];
  try {
    entries = await fs.readdir(plansDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const summaries: PlanSummary[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const fullPath = path.join(plansDir, entry.name);
    try {
      const st = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath, 'utf8');
      summaries.push({
        name: entry.name,
        title: extractPlanTitle(content, entry.name),
        path: path.relative(workspaceRoot, fullPath),
        updatedAt: st.mtimeMs,
        sizeBytes: st.size,
        content,
      });
    } catch {}
  }

  return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getPlan(workspaceRoot: string, planName: string): Promise<PlanDetail | null> {
  if (!isPlanFilePath(planName)) return null;
  const fullPath = await resolvePlanPath(workspaceRoot, planName);
  if (!fullPath || !isPlanFilePath(fullPath)) return null;
  try {
    const st = await fs.stat(fullPath);
    const content = await fs.readFile(fullPath, 'utf8');
    const safeName = path.basename(fullPath);
    return {
      name: safeName,
      title: extractPlanTitle(content, safeName),
      path: path.relative(workspaceRoot, fullPath),
      updatedAt: st.mtimeMs,
      sizeBytes: st.size,
      content,
    };
  } catch {
    return null;
  }
}

function collectPlanPaths(messages: ChatMessage[]): Set<string> {
  const planPaths = new Set<string>();
  for (const m of messages) {
    for (const tc of m.tool_calls ?? []) {
      const target = String(tc.args?.target_file || tc.args?.targetFile || tc.args?.path || tc.args?.planPath || '');
      if (target && isPlanFilePath(target)) {
        planPaths.add(target);
      }
    }
    const text = typeof m.content === 'string' ? m.content : '';
    const matches = text.match(/(?:file:\/\/[^\s)]+|\b[a-zA-Z0-9_\-./]*plan[a-zA-Z0-9_\-./]*\.md\b)/gi);
    if (matches) {
      for (const p of matches) {
        const clean = p.replace(/^file:\/\//, '').trim();
        if (isPlanFilePath(clean)) planPaths.add(clean);
      }
    }
  }
  return planPaths;
}

export async function extractSessionPlans(workspaceRoot: string, messages: ChatMessage[]): Promise<PlanSummary[]> {
  const planPaths = collectPlanPaths(messages);
  const summaries: PlanSummary[] = [];

  for (const rawPath of planPaths) {
    if (!isPlanFilePath(rawPath)) continue;
    const fullPath = await resolvePlanPath(workspaceRoot, rawPath);

    const name = path.basename(rawPath);
    if (fullPath) {
      try {
        const st = await fs.stat(fullPath);
        const content = await fs.readFile(fullPath, 'utf8');
        summaries.push({
          name: path.basename(fullPath),
          title: extractPlanTitle(content, name),
          path: path.relative(workspaceRoot, fullPath),
          updatedAt: st.mtimeMs,
          sizeBytes: st.size,
          content,
        });
        continue;
      } catch {}
    }
    const toolContent = extractToolPlanContent(messages, name, rawPath);
    summaries.push({
      name,
      title: extractPlanTitle(toolContent, name),
      path: rawPath,
      updatedAt: Date.now(),
      sizeBytes: toolContent ? Buffer.byteLength(toolContent, 'utf8') : 0,
      content: toolContent || undefined,
    });
  }

  return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}
