import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { ChatMessage } from '../types';
import type { SessionDetail } from './types';
import { extractSessionPlans } from './planStore';
import { isPlanFilePath } from '../utils/planExtractor';
import { writeIncomingMessage } from '../utils/incomingMessages';
import { parseSubagents, parseBackgroundTasks, enrichPlanDetails, enrichToolResults, enrichThinking } from './sessionEnricher';
import { readPendingApprovals } from './sessionApprovals';
import { readSessionDraft, injectDraftIntoSession } from './sessionDraft';
import { findSessionFile, parseAndDeduplicateLines } from './sessionFinder';

export { listSessions } from './sessionLister';

export async function getSessionDetail(workspaceRoot: string, sessionId: string): Promise<SessionDetail | null> {
  const sDir = path.join(workspaceRoot, '.agent', 'sessions', sessionId);
  const sFile = await findSessionFile(sDir);
  if (!sFile) return null;
  let raw = '';
  try { raw = await fs.readFile(sFile.path, 'utf8'); } catch { return null; }
  const messages: ChatMessage[] = parseAndDeduplicateLines(raw);

  let hasPending = false;
  try {
    const inDir = path.join(sDir, 'incoming');
    const inFiles = (await fs.readdir(inDir)).filter((f) => f.endsWith('.json')).sort();
    hasPending = inFiles.some((f) => !f.startsWith('abort-'));
    const seenUser = new Set<string>();
    for (const m of messages.slice(-5)) {
      if (m.role === 'user' && typeof m.content === 'string') seenUser.add(m.content.trim());
    }
    for (const f of inFiles) {
      try {
        const p = JSON.parse(await fs.readFile(path.join(inDir, f), 'utf8')) as { role?: string; content?: string; action?: string };
        if (p?.action !== 'abort' && p?.content?.trim()) {
          const content = p.content.trim();
          if (!seenUser.has(content)) {
            seenUser.add(content);
            messages.push({ role: (p.role as 'user' | 'assistant') ?? 'user', content });
          }
        }
      } catch {}
    }
  } catch {}

  const title = messages.find((m) => m.role === 'user' && m.content?.trim())?.content?.trim().split(/\r?\n/)[0]?.slice(0, 50) || sessionId;
  const artifacts: Array<{ name: string; path: string; type: string }> = [];
  const filesChanged: Array<{ path: string; status?: string }> = [];
  for (const m of messages) {
    for (const tc of m.tool_calls ?? []) {
      const target = String(tc.args?.target_file || tc.args?.targetFile || tc.args?.path || '');
      if (target && !filesChanged.some((f) => f.path === target)) filesChanged.push({ path: target, status: tc.name?.includes('delete') ? 'deleted' : 'modified' });
      if (target && isPlanFilePath(target) && !artifacts.some((a) => a.path === target)) artifacts.push({ name: path.basename(target), path: target, type: 'plan' });
    }
  }

  enrichThinking(messages);
  enrichToolResults(messages);
  await enrichPlanDetails(workspaceRoot, messages);
  const plans = await extractSessionPlans(workspaceRoot, messages);
  const msgWithMode = [...messages].reverse().find((m) => Boolean((m as { mode?: string }).mode));
  const lastExplicitMode = (msgWithMode as { mode?: 'plan' | 'agent' | 'ask' } | undefined)?.mode;
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const isBuildHandoff = Boolean(lastUserMsg?.content && /I am ready to implement the plan/i.test(lastUserMsg.content));
  const hasPlan = plans.length > 0 || messages.some((m) => Boolean((m as { planMeta?: unknown; mode?: string }).planMeta || (m as { mode?: string }).mode === 'plan'));
  const mode = isBuildHandoff ? 'agent' : (lastExplicitMode || (hasPlan ? 'plan' : 'agent'));

  let abortedAt = 0;
  try {
    const abRaw = await fs.readFile(path.join(sDir, '.aborted'), 'utf8');
    abortedAt = Number((JSON.parse(abRaw) as { abortedAt?: number }).abortedAt) || 0;
  } catch {}
  const hasNewUserTurn = abortedAt > 0 && messages.some((m) => m.role === 'user' && Number((m as { timestamp?: number }).timestamp || 0) > abortedAt);
  const isAborted = abortedAt > 0 && !hasNewUserTurn;

  let hasActiveLock = false;
  if (!isAborted) {
    try {
      const activeSt = await fs.stat(path.join(sDir, '.active'));
      hasActiveLock = activeSt.isFile() && (Date.now() - activeSt.mtimeMs < 120_000);
    } catch {}
  }
  let hasDraft = false;
  if (!isAborted) {
    try {
      const draftSt = await fs.stat(path.join(sDir, 'live_draft.json'));
      hasDraft = draftSt.isFile() && (Date.now() - draftSt.mtimeMs < 60_000);
    } catch {}
  }
  const isGenerating = !isAborted && Boolean(hasActiveLock || (hasDraft && hasPending));
  const subagents = parseSubagents(messages, isGenerating);
  const backgroundTasks = parseBackgroundTasks(messages, isGenerating);
  const pendingApprovals = await readPendingApprovals(sDir);
  const detail: SessionDetail = { id: sessionId, title, mode, createdAt: sFile.birthtimeMs, updatedAt: sFile.mtimeMs, messages, filesChanged, artifacts, subagents, backgroundTasks, pendingApprovals, plans, isGenerating };
  if (isAborted) return detail;
  const draft = await readSessionDraft(workspaceRoot, sessionId);
  return draft ? injectDraftIntoSession(detail, draft) : detail;
}

export async function stopSession(workspaceRoot: string, sessionId: string): Promise<boolean> {
  try {
    const sBase = path.join(workspaceRoot, '.agent', 'sessions'), sids = new Set<string>();
    if (sessionId) sids.add(sessionId);
    try {
      const dirs = await fs.readdir(sBase);
      for (const d of dirs) {
        try { if ((await fs.stat(path.join(sBase, d, '.active'))).isFile()) sids.add(d); } catch {}
      }
    } catch {}
    await Promise.all(Array.from(sids).map(async (sid) => {
      const sDir = path.join(sBase, sid);
      await Promise.all([
        writeIncomingMessage(workspaceRoot, sid, { action: 'abort', content: 'stop', from: 'monitor-stop' }),
        fs.writeFile(path.join(sDir, '.aborted'), JSON.stringify({ abortedAt: Date.now() }), 'utf8').catch(() => {}),
        fs.unlink(path.join(sDir, '.active')).catch(() => {}),
        fs.unlink(path.join(sDir, 'live_draft.json')).catch(() => {}),
      ]);
    }));
    return true;
  } catch { return false; }
}

export async function createSession(workspaceRoot: string, _title?: string): Promise<string> {
  const sessionId = `sess-${crypto.randomBytes(4).toString('hex')}`;
  const dir = path.join(workspaceRoot, '.agent', 'sessions', sessionId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'chat.jsonl'), '', 'utf8');
  await fs.unlink(path.join(dir, '.aborted')).catch(() => {});
  return sessionId;
}
