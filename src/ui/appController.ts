import type { AppState } from './types';
import type { SessionDetail } from '../server/types';
import { fetchSessionDetail, verifyAuthStatus, resolveSessionApproval } from './apiClient';
import { clearStoredToken } from './authStore';
import { initSseClient } from './sseClient';
import { SyncStateMachine } from './syncStateMachine';
import { syncSessionPlans, selectPlanDetail, applyGistSyncPayload, loadCachedGistConfig } from './sessionPlanSync';
import { stopCurrentSession, buildPlanHandoffPrompt, submitMessageFlow } from './messageSender';
import { toggleSyncModeAction } from './appSyncMode';
import { mergeSessionDetail } from './sessionMerge';
import { saveActiveTab, saveActiveSessionId } from './tabStore';
import { checkAndApplyUrlConfig } from './urlConfigLoader';
import { reloadSessionData } from './sessionDataLoader';
import { checkForUpdates } from './updateManager';

export class AppController {
  private sseCleanup: (() => void) | null = null;
  private syncMachine: SyncStateMachine;

  constructor(private state: AppState, private render: () => void) {
    this.syncMachine = new SyncStateMachine({
      onModeChange: (m) => { this.state.syncMode = m; this.render(); },
      onStatusChange: (s) => { this.state.syncStatus = s; this.render(); },
      onDataUpdate: (p) => { if (applyGistSyncPayload(this.state, p)) this.syncMachine.setAwaitingResponse(false); this.render(); },
    });
  }

  async selectSession(id: string): Promise<void> {
    const s = this.state.sessions.find((sess) => sess.id === id), cached = this.state.cachedSessionDetails?.[id];
    const initial: SessionDetail = cached || {
      id, title: s?.title || id, mode: 'agent', createdAt: s?.createdAt || Date.now(), updatedAt: s?.updatedAt || Date.now(),
      messages: [], filesChanged: [], artifacts: [], subagents: [],
      plans: s?.plans?.map((p) => ({ name: p.name, title: p.title, path: p.path, updatedAt: Date.now(), sizeBytes: 0 })) || [],
    };
    const hasCachedMsgs = Boolean(cached?.messages && cached.messages.length > 0);
    Object.assign(this.state, { activeSessionId: id, activeSession: initial, activeTab: 'chat', activePlan: undefined, activePlanName: undefined, isLoadingSession: !hasCachedMsgs });
    saveActiveTab('chat'); saveActiveSessionId(id); void syncSessionPlans(this.state); this.render();
    try {
      const d = await fetchSessionDetail(id);
      if (this.state.activeSessionId === id) {
        if (d) { this.state.activeSession = mergeSessionDetail(this.state.activeSession, d, undefined, this.state.lastAbortedAt); if (this.state.cachedSessionDetails) this.state.cachedSessionDetails[id] = this.state.activeSession; }
        this.state.isLoadingSession = false;
        await syncSessionPlans(this.state); this.render();
      }
    } catch {
      if (this.state.activeSessionId === id) { this.state.isLoadingSession = false; this.render(); }
    }
  }

  async selectPlan(planName: string): Promise<void> {
    this.state.activeTab = 'chat'; saveActiveTab('chat');
    await selectPlanDetail(this.state, planName); this.render();
  }

  handleNewSession(): void {
    Object.assign(this.state, { activeSessionId: undefined, activeSession: undefined, isLoadingSession: false, plans: [], activePlanName: undefined, activePlan: undefined, activeTab: 'chat', attachments: [], composerDraft: '' });
    saveActiveTab('chat'); saveActiveSessionId(undefined); this.render(); (document.getElementById('composer-input') as HTMLTextAreaElement | null)?.focus();
  }
  handleLogout(): void {
    clearStoredToken(); saveActiveSessionId(undefined);
    Object.assign(this.state, { isAuthenticated: false, activeSession: undefined, activeSessionId: undefined, isLoadingSession: false, isLoadingSessions: false, plans: [], activePlanName: undefined, activePlan: undefined, attachments: [] });
    this.sseCleanup?.(); this.syncMachine.stop(); this.render();
  }
  handleLoginSuccess(): void { void this.reloadData(true); this.applyPersistedSyncMode(); }
  handleSelectModel(modelId: string): void { this.state.selectedModel = modelId; this.render(); }
  toggleSyncMode(): void { toggleSyncModeAction(this.state, this.syncMachine, () => this.startSse(), this.sseCleanup || undefined); this.render(); }
  handleStopSession(): void {
    this.state.lastAbortedAt = Date.now();
    this.state.lastAbortedSessionId = this.state.activeSessionId;
    Object.assign(this.state, { isAwaitingResponse: false, awaitingSessionId: undefined, isSending: false });
    if (this.state.activeSession) this.state.activeSession.isGenerating = false;
    for (const s of this.state.sessions) { if (s.id === this.state.activeSessionId || s.isGenerating) s.isGenerating = false; }
    this.syncMachine.setAwaitingResponse(false); this.render();
    void stopCurrentSession(this.state, this.syncMachine).then(() => this.render());
  }

  async handleResolveApproval(commandId: string, allowed: boolean): Promise<void> {
    if (!this.state.activeSessionId) return;
    await resolveSessionApproval(this.state.activeSessionId, commandId, allowed);
    if (this.state.activeSession?.pendingApprovals) this.state.activeSession.pendingApprovals = this.state.activeSession.pendingApprovals.filter((a) => a.commandId !== commandId);
    this.render();
  }

  async handleSendMessage(): Promise<void> {
    const input = document.getElementById('composer-input') as HTMLTextAreaElement | null, text = (input?.value || this.state.composerDraft || '').trim();
    if (!text && (!this.state.attachments || this.state.attachments.length === 0)) return;
    await submitMessageFlow(this.state, this.syncMachine, text, () => this.reloadData(false), this.render);
  }
  async handleBuildPlan(planPath: string, planTitle?: string): Promise<void> {
    this.state.composerMode = 'agent';
    await submitMessageFlow(this.state, this.syncMachine, buildPlanHandoffPrompt(planPath, planTitle), () => this.reloadData(false), this.render);
  }

  async reloadData(isInitial = false): Promise<void> {
    await reloadSessionData(this.state, isInitial, () => {
      if (this.state.isAwaitingResponse === false) this.syncMachine.setAwaitingResponse(false);
      this.render();
    });
  }

  startSse(): void {
    this.sseCleanup?.();
    this.sseCleanup = initSseClient({
      onStatusChange: (s) => {
        this.state.syncStatus = s;
        if (s === 'disconnected') this.syncMachine.handlePrimarySseFailure();
        else if (s === 'connected') this.syncMachine.restorePrimaryLive();
        this.render();
      },
      onChange: () => { void this.reloadData(false); },
    });
  }

  private applyPersistedSyncMode(): void {
    const cfg = loadCachedGistConfig();
    if (cfg) this.syncMachine.setGistConfig(cfg);
    const mode = (typeof localStorage !== 'undefined' && localStorage.getItem('agent_sync_mode')) || 'live-sse';
    if (mode === 'git-backup' && cfg) this.syncMachine.forceGitBackupMode(); else this.startSse();
  }

  async init(): Promise<void> {
    const urlConfig = checkAndApplyUrlConfig(), auth = await verifyAuthStatus();
    this.state.isAuthenticated = urlConfig.imported || !auth.required || auth.authorized;
    this.render();
    if (this.state.isAuthenticated) {
      this.applyPersistedSyncMode();
      await this.reloadData(true);
      void checkForUpdates(this.state, this.render);
    }
  }
}
