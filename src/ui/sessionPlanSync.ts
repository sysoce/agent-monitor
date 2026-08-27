import type { AppState } from './types';
import type { GistSyncConfig } from '../sync/types';
import type { PlanDetail } from '../server/types';
import { fetchPlanDetail } from './apiClient';
import { getStoredToken } from './authStore';
import { isPlanFilePath } from '../utils/planExtractor';

export function loadCachedGistConfig(): GistSyncConfig | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('agent_gist_sync');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { token?: string; gistId?: string };
    if (!parsed.token || !parsed.gistId) return undefined;
    return { token: parsed.token.trim(), gistId: parsed.gistId.trim(), password: getStoredToken() || undefined };
  } catch {
    return undefined;
  }
}

function extractPlanFromSession(session: AppState['activeSession'], planName: string): PlanDetail | null {
  if (!session || !isPlanFilePath(planName)) return null;
  const base = planName.split('/').pop() || planName;
  for (const m of session.messages || []) {
    for (const tc of (m as any).tool_calls ?? []) {
      const t = String(tc.args?.target_file || tc.args?.targetFile || tc.args?.path || '');
      if (isPlanFilePath(t) && (t === planName || t.split('/').pop() === base)) {
        const content = String(tc.args?.CodeContent || tc.args?.content || tc.args?.code || '');
        if (content) {
          const match = content.match(/^#\s+(.+)$/m);
          return {
            name: base,
            title: match ? match[1]!.trim() : base,
            path: t || planName,
            updatedAt: session.updatedAt || Date.now(),
            sizeBytes: content.length,
            content,
          };
        }
      }
    }
  }
  return null;
}

export async function syncSessionPlans(state: AppState): Promise<void> {
  const sPlans = state.activeSession?.plans || [];
  state.plans = sPlans;
  if (state.activePlanName) {
    const existing = sPlans.find((p) => p.name === state.activePlanName || p.path === state.activePlanName);
    if (existing?.content) {
      state.activePlan = { ...existing, content: existing.content };
      return;
    }
    try { state.activePlan = await fetchPlanDetail(state.activePlanName); } catch {}
    if (!state.activePlan) {
      state.activePlan = extractPlanFromSession(state.activeSession, state.activePlanName) || undefined;
    }
  }
}

export async function selectPlanDetail(state: AppState, planName: string): Promise<void> {
  if (!planName || !isPlanFilePath(planName)) return;
  const baseName = planName.split('/').pop() || planName;
  state.activePlanName = baseName;
  state.activeTab = 'chat';

  const existingInPlans = state.plans?.find((p) => p.name === baseName || p.path === planName);
  if (existingInPlans?.content) {
    state.activePlan = { ...existingInPlans, content: existingInPlans.content };
    return;
  }

  try {
    const fetched = await fetchPlanDetail(planName);
    if (fetched?.content) {
      state.activePlan = fetched;
      if (!state.plans.some((p) => p.name === fetched.name)) {
        state.plans = [fetched, ...state.plans];
      }
      return;
    }
  } catch {}

  const extracted = extractPlanFromSession(state.activeSession, planName);
  if (extracted) {
    state.activePlan = extracted;
    if (!state.plans.some((p) => p.name === extracted.name)) {
      state.plans = [extracted, ...state.plans];
    }
    return;
  }

  state.activePlan = {
    name: baseName,
    title: existingInPlans?.title || baseName,
    path: existingInPlans?.path || planName,
    content: `# ${existingInPlans?.title || baseName}\n\n*Plan referenced in session: ${planName}*`,
    updatedAt: Date.now(),
    sizeBytes: 0,
  };
}


export { applyGistSyncPayload } from './gistPayloadApplier';

