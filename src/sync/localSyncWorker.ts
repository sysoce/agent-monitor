import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { GistClient } from './gistClient';
import type { SyncOutboxState } from './types';
import { listSessions, getSessionDetail } from '../server/sessionStore';
import { sanitizeSessionForSync, loadRecentSessionDetails } from './syncSanitizer';
import { computeSessionsFingerprint } from './syncFingerprint';
import { computeHostPollInterval } from './syncPollingPolicy';
import { drainIncomingMessages } from './syncDrainHelper';
import { CLIENT_VERSION } from '../ui/version';

export class LocalSyncWorker {
  private pollTimer?: NodeJS.Timeout;
  private syncThrottleTimer?: NodeJS.Timeout;
  private lastEtag?: string;
  private isProcessing = false;
  private isSyncingOutbox = false;
  private isPolling = false;
  private lastSessionsFingerprint = '';
  private lastOutboxSyncTime = 0;
  private lastActivityAt = Date.now();
  private pendingActiveSessionId?: string;

  constructor(private readonly workspaceRoot: string, private readonly gistClient: GistClient) {}

  private async computeFingerprint(sessions: Array<{ id: string; updatedAt: number; messageCount: number }>): Promise<string> { return computeSessionsFingerprint(this.workspaceRoot, sessions); }

  async pollInboxOnce(): Promise<void> {
    if (this.isProcessing || this.gistClient.isBlockedByRateLimit?.()) {
      if (this.isPolling) this.scheduleNextPoll();
      return;
    }
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
      this.lastActivityAt = Date.now();
      const { processedIds, hasAbort } = await drainIncomingMessages(this.workspaceRoot, res.data.inbox);
      const activeId = res.data.inbox[0]?.sessionId || sessions[0]?.id;
      if (activeId) this.pendingActiveSessionId = activeId;
      const recentDetails = await loadRecentSessionDetails(this.workspaceRoot, sessions, activeId);
      if (hasAbort) {
        for (const sid of Object.keys(recentDetails)) if (recentDetails[sid]) recentDetails[sid].isGenerating = false;
      } else if (activeId && !recentDetails[activeId] && res.data.inbox[0]) {
        const first = res.data.inbox[0];
        const msgTs = first.timestamp || Date.now();
        recentDetails[activeId] = { id: activeId, title: first.content?.slice(0, 40) || (first.attachments?.[0]?.label ?? activeId), mode: first.mode || 'agent', createdAt: msgTs, updatedAt: msgTs, messages: [{ role: first.role || 'user', content: first.content || '', attachments: first.attachments, timestamp: msgTs }], filesChanged: [], artifacts: [], subagents: [], backgroundTasks: [], plans: [], isGenerating: true };
      }
      if (activeId && !sessions.some((s) => s.id === activeId)) {
        const recent = recentDetails[activeId];
        const ts = recent?.updatedAt || Date.now();
        sessions.unshift({ id: activeId, title: recent?.title || activeId, createdAt: recent?.createdAt || ts, updatedAt: ts, messageCount: 1, preview: res.data.inbox[0]?.content?.slice(0, 80) || '(empty session)', isGenerating: true });
      }
      const activeDetail = activeId ? (recentDetails[activeId] || await getSessionDetail(this.workspaceRoot, activeId)) : undefined;
      const outbox: SyncOutboxState = { sessionId: activeId || '', updatedAt: Date.now(), session: activeDetail ? sanitizeSessionForSync(activeDetail) : undefined, plans: activeDetail?.plans || [] };
      this.lastSessionsFingerprint = await this.computeFingerprint(sessions);
      this.lastOutboxSyncTime = Date.now();
      await this.gistClient.updateOutboxAndDrainInbox(outbox, processedIds, sessions, recentDetails, res.data, CLIENT_VERSION);
    } catch (err) {
      console.error('[SyncWorker Poll Error]', err);
      try {
        const currentFp = await this.computeFingerprint((await listSessions(this.workspaceRoot)).slice(0, 40));
        if (currentFp !== this.lastSessionsFingerprint) {
          this.lastSessionsFingerprint = currentFp;
          void this.syncOutboxOnce(undefined, true);
        }
      } catch {}
    } finally {
      this.isProcessing = false;
      if (this.isPolling) this.scheduleNextPoll();
    }
  }

  private scheduleNextPoll(): void {
    if (!this.isPolling) return;
    if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = undefined; }
    const rateInfo = this.gistClient.getRateLimitInfo?.();
    if (rateInfo?.isBlocked) {
      this.pollTimer = setTimeout(() => { void this.pollInboxOnce(); }, Math.max(5000, rateInfo.resetTime - Date.now() + 2000));
      this.pollTimer.unref?.();
      return;
    }
    void this.isGenerating(this.pendingActiveSessionId).then((isGen) => {
      if (!this.isPolling) return;
      const interval = computeHostPollInterval({ isGenerating: isGen, lastActivityAt: this.lastActivityAt, remainingQuota: rateInfo?.remaining });
      this.pollTimer = setTimeout(() => { void this.pollInboxOnce(); }, interval);
      this.pollTimer.unref?.();
    });
  }

  async syncOutboxOnce(activeSessionId?: string, force = false): Promise<void> {
    if (this.isSyncingOutbox || this.gistClient.isBlockedByRateLimit?.()) return;
    const now = Date.now();
    if (!force && now - this.lastOutboxSyncTime < 4000) {
      if (!this.syncThrottleTimer) {
        this.syncThrottleTimer = setTimeout(() => { this.syncThrottleTimer = undefined; void this.syncOutboxOnce(this.pendingActiveSessionId); }, 4000 - (now - this.lastOutboxSyncTime));
        this.syncThrottleTimer.unref?.();
      }
      return;
    }
    this.isSyncingOutbox = true;
    this.lastOutboxSyncTime = now;
    try {
      const allSessions = await listSessions(this.workspaceRoot);
      const sessions = allSessions.slice(0, 40);
      const targetId = activeSessionId || this.pendingActiveSessionId || sessions[0]?.id;
      this.lastSessionsFingerprint = await this.computeFingerprint(sessions);
      const recentDetails = await loadRecentSessionDetails(this.workspaceRoot, sessions, targetId);
      const detail = targetId ? (recentDetails[targetId] || await getSessionDetail(this.workspaceRoot, targetId)) : undefined;
      const outbox: SyncOutboxState = { sessionId: targetId || '', updatedAt: Date.now(), session: detail ? sanitizeSessionForSync(detail) : undefined, plans: detail?.plans || [] };
      await this.gistClient.updateOutboxAndDrainInbox(outbox, [], sessions, recentDetails, null, CLIENT_VERSION);
    } catch (err) {
      console.error('[SyncWorker Outbox Error]', err);
    } finally {
      this.isSyncingOutbox = false;
    }
  }

  private async isGenerating(targetId?: string): Promise<boolean> {
    const sid = targetId || (await listSessions(this.workspaceRoot))[0]?.id;
    if (!sid) return false;
    const sDir = path.join(this.workspaceRoot, '.agent', 'sessions', sid);
    return Promise.all([fs.stat(path.join(sDir, '.active')).catch(() => null), fs.stat(path.join(sDir, 'live_draft.json')).catch(() => null)])
      .then(([a, d]) => Boolean(a?.isFile() || d?.isFile())).catch(() => false);
  }

  async scheduleOutboxSync(activeSessionId?: string, debounceMs = 2000): Promise<void> {
    if (activeSessionId) this.pendingActiveSessionId = activeSessionId;
    if (this.gistClient.isBlockedByRateLimit?.()) return;
    const targetId = this.pendingActiveSessionId;
    if (!(await this.isGenerating(targetId))) {
      if (this.syncThrottleTimer) { clearTimeout(this.syncThrottleTimer); this.syncThrottleTimer = undefined; }
      await this.syncOutboxOnce(targetId, true);
      return;
    }
    if (this.syncThrottleTimer) clearTimeout(this.syncThrottleTimer);
    this.syncThrottleTimer = setTimeout(() => { this.syncThrottleTimer = undefined; void this.syncOutboxOnce(this.pendingActiveSessionId); }, debounceMs);
    this.syncThrottleTimer.unref?.();
  }

  start(): void { this.stop(); this.isPolling = true; void this.pollInboxOnce(); void this.scheduleOutboxSync(undefined, 800); }
  stop(): void { this.isPolling = false; if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = undefined; } if (this.syncThrottleTimer) { clearTimeout(this.syncThrottleTimer); this.syncThrottleTimer = undefined; } }
}
