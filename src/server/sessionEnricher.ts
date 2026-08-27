import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ChatMessage } from '../types';
import type { SessionSubagentItem } from './types';
import { resolvePlanPath } from './planStore';
import { extractPlanMeta, extractTodosFromMarkdown, isPlanFilePath } from '../utils/planExtractor';

import { extractThinkingBlocks } from '../utils/thinkingTags';

export function enrichThinking(messages: ChatMessage[]): void {
  for (const m of messages) {
    if (m.role === 'assistant') {
      const existing = (m as { thought?: string; thinking?: string }).thought ?? (m as { thought?: string; thinking?: string }).thinking;
      if (!existing && typeof m.content === 'string' && m.content.includes('<')) {
        const { thinking, cleanText } = extractThinkingBlocks(m.content);
        if (thinking) {
          (m as { thought?: string }).thought = thinking;
          m.content = cleanText;
        }
      }
    }
  }
}

export function enrichToolResults(messages: ChatMessage[]): void {
  const toolResults = new Map<string, unknown>();
  for (const m of messages) {
    if (m.role === 'tool' && (m as { tool_call_id?: string }).tool_call_id) {
      toolResults.set((m as { tool_call_id?: string }).tool_call_id!, m.content);
    }
  }
  for (const m of messages) {
    if (m.role === 'assistant' && m.tool_calls) {
      for (const tc of m.tool_calls) {
        if (tc.id && toolResults.has(tc.id)) {
          (tc as { result?: unknown }).result = toolResults.get(tc.id);
        }
      }
    }
  }
}


export function parseSubagents(messages: ChatMessage[], isGenerating: boolean): SessionSubagentItem[] {
  const subagents: SessionSubagentItem[] = [];
  for (const m of messages) {
    for (const tc of m.tool_calls ?? []) {
      if (tc.name === 'invoke_subagent' && Array.isArray(tc.args?.Subagents)) {
        for (const s of tc.args.Subagents as Array<{ Role?: string; TypeName?: string; Prompt?: string }>) {
          const status = isGenerating ? 'running' : 'completed';
          subagents.push({ id: tc.id || 'subagent', role: s.Role || 'Subagent', type: s.TypeName, prompt: s.Prompt, summary: s.Prompt, status });
        }
      }
    }
  }
  return subagents;
}

export function parseBackgroundTasks(messages: ChatMessage[], isGenerating: boolean): Array<{ id: string; name: string; command?: string; status: 'running' | 'completed' | 'failed' | 'done' }> {
  const tasks: Array<{ id: string; name: string; command?: string; status: 'running' | 'completed' | 'failed' | 'done' }> = [];
  for (const m of messages) {
    for (const tc of m.tool_calls ?? []) {
      if (tc.name === 'manage_task' || tc.name === 'schedule' || (tc.name === 'run_command' && (tc.args?.IsDaemon || tc.args?.is_daemon))) {
        const id = tc.id || `task-${tasks.length + 1}`;
        const name = String(tc.args?.CommandLine || tc.args?.command || tc.args?.Prompt || tc.name);
        const status = isGenerating ? 'running' : 'completed';
        tasks.push({ id, name, status });
      }
    }
  }
  return tasks;
}

export async function enrichPlanDetails(workspaceRoot: string, messages: ChatMessage[]): Promise<void> {
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    let planTarget = '';
    for (const tc of m.tool_calls ?? []) {
      const target = String(tc.args?.target_file || tc.args?.targetFile || tc.args?.path || '');
      if (target && isPlanFilePath(target)) { planTarget = target; break; }
    }
    if (!planTarget && typeof m.content === 'string') {
      const match = m.content.match(/\b([a-zA-Z0-9_\-./]+(?:\.plan\.md|plans\/[a-zA-Z0-9_\-.]+\.md|_plan\.md))\b/i);
      if (match && isPlanFilePath(match[1])) planTarget = match[1];
    }
    if (planTarget && isPlanFilePath(planTarget) && !(m as any).planMeta) {
      const resolved = await resolvePlanPath(workspaceRoot, planTarget);
      if (resolved) {
        try {
          const content = await fs.readFile(resolved, 'utf8');
          const meta = extractPlanMeta(planTarget, content);
          if (meta && meta.title) {
            (m as any).planMeta = meta;
            if (!(m as any).todos) {
              const extractedTodos = extractTodosFromMarkdown(content);
              if (extractedTodos.length > 0) (m as any).todos = extractedTodos;
            }
          }
        } catch {}
      }
    }
  }
}

export function extractSummaryPlansAndArtifacts(rawLines: string[]): {

  plans: Array<{ name: string; title: string; path: string }>;
  artifacts: Array<{ name: string; path: string; type?: string }>;
} {
  const plans: Array<{ name: string; title: string; path: string }> = [];
  const artifacts: Array<{ name: string; path: string; type?: string }> = [];
  const seenPlans = new Set<string>();
  const seenArtifacts = new Set<string>();

  for (const line of rawLines) {
    try {
      const msg = JSON.parse(line) as { role?: string; content?: string; tool_calls?: any[] };
      for (const tc of msg.tool_calls || []) {
        const target = String(tc.args?.target_file || tc.args?.targetFile || tc.args?.path || '');
        if (!target) continue;
        const name = path.basename(target);
        if (isPlanFilePath(target)) {
          if (!seenPlans.has(target)) {
            seenPlans.add(target);
            plans.push({ name, title: name.replace(/[-_.]/g, ' ').replace(/\bmd\b/i, '').trim(), path: target });
          }
        } else if (target.includes('.agent/') || target.includes('artifacts/')) {
          if (!seenArtifacts.has(target)) {
            seenArtifacts.add(target);
            artifacts.push({ name, path: target, type: 'file' });
          }
        }
      }
      if (typeof msg.content === 'string') {
        const matches = msg.content.matchAll(/(?:file:\/\/[^\s)]+|\b[a-zA-Z0-9_\-./]*plan[a-zA-Z0-9_\-./]*\.md\b)/gi);
        for (const match of matches) {
          const rawPath = match[0].replace(/^file:\/\//, '');
          if (isPlanFilePath(rawPath) && !seenPlans.has(rawPath)) {
            seenPlans.add(rawPath);
            const name = path.basename(rawPath);
            plans.push({ name, title: name.replace(/[-_.]/g, ' ').replace(/\bmd\b/i, '').trim(), path: rawPath });
          }
        }
      }
    } catch {}
  }

  return { plans, artifacts };
}
