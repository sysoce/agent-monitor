import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ChatMessage } from '../types';
import type { SessionDetail } from './types';
import { extractSessionPlans } from './planStore';
import { isPlanFilePath } from '../utils/planExtractor';
import { parseSubagents, parseBackgroundTasks, enrichPlanDetails, enrichToolResults, enrichThinking } from './sessionEnricher';
import { readPendingApprovals } from './sessionApprovals';
import { readSessionDraft, injectDraftIntoSession } from './sessionDraft';
import { findSessionFile, parseAndDeduplicateLines } from './sessionFinder';
import { extractMessageTimestamp } from './sessionActivity';
import { readIncomingMessages } from './sessionIncoming';

export { listSessions } from './sessionLister';
export { stopSession, createSession } from './sessionLifecycle';

export async function getSessionDetail(workspaceRoot: string, sessionId: string): Promise<SessionDetail | null> {
  const sDir = path.join(workspaceRoot, '.agent', 'sessions', sessionId);
  const sFile = await findSessionFile(sDir);
  if (!sFile) return null;
  let raw = '';
  try { raw = await fs.readFile(sFile.path, 'utf8'); } catch { return null; }
  const messages: ChatMessage[] = parseAndDeduplicateLines(raw);

  const { hasPending, incomingMtime } = await readIncomingMessages(sDir, messages);

  const firstUser = messages.find((m) => m.role === 'user' && (m.content?.trim() || (m.attachments && m.attachments.length > 0)));
  const title = firstUser?.content?.trim().split(/\r?\n/)[0]?.slice(0, 50) || firstUser?.attachments?.[0]?.label || sessionId;
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

  let hasActiveLock = false, activeMtime = 0;
  try {
    const activeSt = await fs.stat(path.join(sDir, '.active'));
    hasActiveLock = activeSt.isFile() && (Date.now() - activeSt.mtimeMs < 1800_000);
    activeMtime = activeSt.mtimeMs;
  } catch {}

  let hasDraft = false, draftMtime = 0;
  try {
    const draftSt = await fs.stat(path.join(sDir, 'live_draft.json'));
    if (draftSt.isFile() && Date.now() - draftSt.mtimeMs < 60_000) {
      draftMtime = draftSt.mtimeMs;
      try {
        const dObj = JSON.parse(await fs.readFile(path.join(sDir, 'live_draft.json'), 'utf8')) as { timestamp?: number };
        const dTs = Number(dObj.timestamp) || 0;
        if (abortedAt === 0 || dTs === 0 || dTs > abortedAt) hasDraft = true;
      } catch {
        hasDraft = true;
      }
    }
  } catch {}

  let firstMsgTimestamp: number | undefined, lastMsgTimestamp: number | undefined;
  for (const m of messages) {
    const ts = extractMessageTimestamp(m);
    if (ts !== undefined) {
      if (firstMsgTimestamp === undefined || ts < firstMsgTimestamp) firstMsgTimestamp = ts;
      if (lastMsgTimestamp === undefined || ts > lastMsgTimestamp) lastMsgTimestamp = ts;
    }
  }

  const userTimestamps = messages.filter((m) => m.role === 'user').map((m) => Number((m as { timestamp?: number }).timestamp || 0)).filter((t) => t > 0);
  const maxUserTs = userTimestamps.length > 0 ? Math.max(...userTimestamps) : 0;
  const hasNewActivity = (hasActiveLock && activeMtime > abortedAt) ||
    (hasDraft && draftMtime > abortedAt) ||
    (hasPending && incomingMtime > abortedAt) ||
    (maxUserTs > abortedAt);
  const isAborted = abortedAt > 0 && !hasNewActivity;

  const hasUnresolvedTools = Boolean(
    hasActiveLock &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === 'assistant' &&
    messages[messages.length - 1]?.tool_calls?.some((tc: any) =>
      !messages.some((m) => m.role === 'tool' && (m as any).tool_call_id === tc.id)
    )
  );

  const isGenerating = !isAborted && Boolean(hasActiveLock || hasDraft || hasPending || hasUnresolvedTools);
  const subagents = parseSubagents(messages, isGenerating);
  const backgroundTasks = parseBackgroundTasks(messages, isGenerating);
  const hasRunningSub = subagents.some((s) => s.status === 'running');
  const hasRunningBg = backgroundTasks.some((t) => t.status === 'running');
  const finalIsGenerating = !isAborted && Boolean(isGenerating || hasRunningSub || hasRunningBg);
  const pendingApprovals = await readPendingApprovals(sDir);

  const liveMax = Math.max(activeMtime, draftMtime, incomingMtime);
  const updatedAt = lastMsgTimestamp !== undefined ? Math.max(lastMsgTimestamp, liveMax) : Math.max(sFile.mtimeMs, liveMax);
  const createdAt = firstMsgTimestamp || sFile.birthtimeMs || sFile.mtimeMs || updatedAt;

  const detail: SessionDetail = { id: sessionId, title, mode, createdAt, updatedAt, messages, filesChanged, artifacts, subagents, backgroundTasks, pendingApprovals, plans, isGenerating: finalIsGenerating };
  if (isAborted) return detail;
  const draft = await readSessionDraft(workspaceRoot, sessionId);
  return draft ? injectDraftIntoSession(detail, draft) : detail;
}
