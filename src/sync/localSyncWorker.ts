import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { GistClient } from './gistClient';
import type { SyncOutboxState } from './types';
import { listSessions, getSessionDetail, stopSession } from '../server/sessionStore';
import { sanitizeSessionForSync } from './syncSanitizer';
import { computeSessionsFingerprint } from './syncFingerprint';
import { CLIENT_VERSION } from '../ui/version';

export class LocalSyncWorker {
  private pollTimer?: NodeJS.Timeout;
  private syncThrottleTimer?: NodeJS.Timeout;
  private lastEtag?: string;
  private isProcessing = false;
  private isSyncingOutbox = false;
  private lastSessionsFingerprint = '';
  private lastOutboxSyncTime = 0;
  private pendingActiveSessionId?: string;
  private cachedAppVersion?: string;

  constructor(
    private readonly workspaceRoot: string,
    private readonly gistClient: GistClient
  ) {}

  private async computeFingerprint(sessions: Array<{ id: string; updatedAt: number; messageCount: number }>): Promise<string> {
    return computeSessionsFingerprint(this.workspaceRoot, sessions);
  }

  private async loadRecentDetails(sessions: Array<{ id: string }>, extraId?: string, limit = 3): Promise<Record<string, any>> {
    const details: Record<string, any> = {};
    const targetIds = new Set(sessions.slice(0, limit).map((s) => s.id));
    if (extraId) targetIds.add(extraId);
    for (const sid of targetIds) {
      try {
        const d = await getSessionDetail(this.workspaceRoot, sid);
        if (d) details[sid] = sanitizeSessionForSync(d);
      } catch {}
    }
    return details;
  }

  async pollInboxOnce(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      const res = await this.gistClient.fetchSyncState(this.lastEtag);
      if (res.etag) this.lastEtag = res.etag;
      const allSessions = await listSessions(this.workspaceRoot);
      const sessions = allSessions.slice(0, 40);
      const currentFp = await this.computeFingerprint(sessions);
      if (currentFp !== this.lastSessionsFingerprint || (!res.notModified && res.data && res.data.sessions.length === 0)) {
        this.lastSessionsFingerprint = currentFp;
        this.scheduleOutboxSync(res.data?.inbox?.[0]?.sessionId);
      }
      if (res.notModified || !res.data || res.data.inbox.length === 0) return;
      const processedIds: string[] = [], hasAbort = res.data.inbox.some((m) => m.action === 'abort' || (m.role as string) === 'abort');
      for (const msg of res.data.inbox) {
        if (msg.action === 'abort' || (msg.role as string) === 'abort') {
          await stopSession(this.workspaceRoot, msg.sessionId);
        } else {
          const inDir = path.join(this.workspaceRoot, '.agent', 'sessions', msg.sessionId, 'incoming');
          await fs.mkdir(inDir, { recursive: true });
          await fs.writeFile(path.join(inDir, `${msg.timestamp}_${msg.id}.json`), JSON.stringify({ role: msg.role || 'user', content: msg.content, model: msg.model, mode: msg.mode, action: msg.action || 'message', timestamp: msg.timestamp, commandId: msg.commandId, allowed: msg.allowed }), 'utf8');
        }
        processedIds.push(msg.id);
      }
      const activeId = res.data.inbox[0]?.sessionId || sessions[0]?.id;
      if (activeId) this.pendingActiveSessionId = activeId;
      const recentDetails = await this.loadRecentDetails(sessions, activeId);
      if (hasAbort) {
        for (const sid of Object.keys(recentDetails)) if (recentDetails[sid]) recentDetails[sid].isGenerating = false;
      } else if (activeId && !recentDetails[activeId] && res.data.inbox[0]) {
        const first = res.data.inbox[0];
        recentDetails[activeId] = { id: activeId, title: first.content?.slice(0, 40) || activeId, mode: first.mode || 'agent', createdAt: Date.now(), updatedAt: Date.now(), messages: [{ role: first.role || 'user', content: first.content || '' }], filesChanged: [], artifacts: [], subagents: [], backgroundTasks: [], plans: [], isGenerating: true };
      }
      if (activeId && !sessions.some((s) => s.id === activeId)) {
        sessions.unshift({ id: activeId, title: recentDetails[activeId]?.title || activeId, createdAt: Date.now(), updatedAt: Date.now(), messageCount: 1, preview: res.data.inbox[0]?.content?.slice(0, 80) || '(empty session)' });
      }
      const activeDetail = activeId ? (recentDetails[activeId] || await getSessionDetail(this.workspaceRoot, activeId)) : undefined;
      const outbox: SyncOutboxState = { sessionId: activeId || '', updatedAt: Date.now(), session: activeDetail ? sanitizeSessionForSync(activeDetail) : undefined, plans: activeDetail?.plans || [] };
      this.lastSessionsFingerprint = await this.computeFingerprint(sessions);
      this.lastOutboxSyncTime = Date.now();
      await this.gistClient.updateOutboxAndDrainInbox(outbox, processedIds, sessions, recentDetails, res.data, await this.getAppVersion());
    } catch (err) {
      console.error('[SyncWorker Poll Error]', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async getAppVersion(): Promise<string> {
    return CLIENT_VERSION;
  }

  async syncOutboxOnce(activeSessionId?: string): Promise<void> {
    if (this.isSyncingOutbox) return;
    this.isSyncingOutbox = true;
    this.lastOutboxSyncTime = Date.now();
    try {
      const allSessions = await listSessions(this.workspaceRoot);
      const sessions = allSessions.slice(0, 40);
      const targetId = activeSessionId || this.pendingActiveSessionId || sessions[0]?.id;
      this.lastSessionsFingerprint = await this.computeFingerprint(sessions);
      const recentDetails = await this.loadRecentDetails(sessions, targetId);
      const detail = targetId ? (recentDetails[targetId] || await getSessionDetail(this.workspaceRoot, targetId)) : undefined;
      const sanitizedDetail = detail ? sanitizeSessionForSync(detail) : undefined;
      const outbox: SyncOutboxState = { sessionId: targetId || '', updatedAt: Date.now(), session: sanitizedDetail, plans: detail?.plans || [] };
      await this.gistClient.updateOutboxAndDrainInbox(outbox, [], sessions, recentDetails, null, await this.getAppVersion());
    } catch (err) {
      console.error('[SyncWorker Outbox Error]', err);
    } finally {
      this.isSyncingOutbox = false;
    }
  }

  private async isGenerating(targetId?: string): Promise<boolean> {
    const sid = targetId || (await listSessions(this.workspaceRoot))[0]?.id;
    if (!sid) return false;
    try {
      const sDir = path.join(this.workspaceRoot, '.agent', 'sessions', sid);
      const [active, draft] = await Promise.all([fs.stat(path.join(sDir, '.active')).catch(() => null), fs.stat(path.join(sDir, 'live_draft.json')).catch(() => null)]);
      return Boolean(active?.isFile() || draft?.isFile());
    } catch { return false; }
  }

  async scheduleOutboxSync(activeSessionId?: string, debounceMs = 1200): Promise<void> {
    if (activeSessionId) this.pendingActiveSessionId = activeSessionId;
    const targetId = this.pendingActiveSessionId;
    if (!(await this.isGenerating(targetId))) {
      if (this.syncThrottleTimer) { clearTimeout(this.syncThrottleTimer); this.syncThrottleTimer = undefined; }
      await this.syncOutboxOnce(targetId);
      return;
    }
    if (this.syncThrottleTimer) clearTimeout(this.syncThrottleTimer);
    this.syncThrottleTimer = setTimeout(() => { this.syncThrottleTimer = undefined; void this.syncOutboxOnce(this.pendingActiveSessionId); }, debounceMs);
  }

  start(intervalMs = 4000): void {
    this.stop(); void this.pollInboxOnce(); void this.scheduleOutboxSync();
    this.pollTimer = setInterval(() => { void this.pollInboxOnce(); }, intervalMs);
  }
  stop(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = undefined; }
    if (this.syncThrottleTimer) { clearTimeout(this.syncThrottleTimer); this.syncThrottleTimer = undefined; }
  }
}
