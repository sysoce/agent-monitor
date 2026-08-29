import type { SessionSummary, SessionDetail, PlanSummary, PlanDetail, ModelOption, ModelGroup } from '../server/types';
import type { MentionSuggestionItem } from '../types';
import type { AttachmentItem } from '../types';
import { getStoredToken, setStoredToken, buildApiUrl, hasLiveServer } from './authStore';

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AuthVerifyResult {
  required: boolean;
  authorized: boolean;
  gistConfig?: { token: string; gistId: string };
}

export async function verifyAuthStatus(): Promise<AuthVerifyResult> {
  if (hasLiveServer()) {
    try {
      const res = await fetch(buildApiUrl('/api/auth/verify'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = (await res.json()) as AuthVerifyResult;
        if (data.gistConfig) localStorage.setItem('agent_gist_sync', JSON.stringify(data.gistConfig));
        return data;
      }
    } catch {}
  }
  const stored = getStoredToken(), rawGist = typeof localStorage !== 'undefined' ? localStorage.getItem('agent_gist_sync') : null;
  return { required: true, authorized: Boolean(stored && rawGist) };
}

export async function loginWithPassword(password: string): Promise<boolean> {
  if (hasLiveServer()) {
    try {
      const res = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; token?: string; gistConfig?: { token: string; gistId: string } };
        if (data.token) setStoredToken(data.token);
        if (data.gistConfig) localStorage.setItem('agent_gist_sync', JSON.stringify(data.gistConfig));
        return data.ok;
      }
    } catch {}
  }
  const rawGist = typeof localStorage !== 'undefined' ? localStorage.getItem('agent_gist_sync') : null;
  if (rawGist && password) {
    try {
      const parsed = JSON.parse(rawGist);
      if (parsed.gistId && parsed.token) {
        setStoredToken(password);
        if (typeof localStorage !== 'undefined') localStorage.setItem('agent_sync_mode', 'git-backup');
        return true;
      }
    } catch {}
  }
  return false;
}

export interface ModelCatalogResponse { models: ModelOption[]; groups?: ModelGroup[]; currentProvider?: string; }
export async function fetchModels(): Promise<ModelCatalogResponse> {
  if (!hasLiveServer()) return { models: [] };
  try {
    const res = await fetch(buildApiUrl('/api/models'), { headers: getAuthHeaders() });
    if (!res.ok) return { models: [] };
    const data = (await res.json()) as ModelCatalogResponse;
    return { models: data.models || [], groups: data.groups || [], currentProvider: data.currentProvider };
  } catch { return { models: [] }; }
}

export async function fetchMentions(query: string): Promise<MentionSuggestionItem[]> {
  if (!hasLiveServer()) return [];
  try {
    const res = await fetch(buildApiUrl(`/api/mentions?q=${encodeURIComponent(query)}`), { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return ((await res.json()) as { mentions: MentionSuggestionItem[] }).mentions || [];
  } catch { return []; }
}

export async function fetchSessions(): Promise<SessionSummary[]> {
  if (!hasLiveServer()) return [];
  const res = await fetch(buildApiUrl('/api/sessions'), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.statusText}`);
  return ((await res.json()) as { sessions: SessionSummary[] }).sessions;
}

export async function fetchSessionDetail(id: string): Promise<SessionDetail> {
  if (!hasLiveServer()) throw new Error('No live server');
  const res = await fetch(buildApiUrl(`/api/sessions/${encodeURIComponent(id)}`), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch session detail: ${res.statusText}`);
  return ((await res.json()) as { session: SessionDetail }).session;
}

export async function createSession(title?: string): Promise<{ id: string }> {
  const res = await fetch(buildApiUrl('/api/sessions'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ title }) });
  if (!res.ok) throw new Error(`Failed to create session: ${res.statusText}`);
  return (await res.json()) as { id: string };
}

export async function sendSessionMessage(
  sessionId: string, content: string, role?: 'user' | 'assistant', model?: string, mode?: string, attachments?: AttachmentItem[]
): Promise<void> {
  const res = await fetch(buildApiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/messages`), {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ content, role, model, mode, attachments }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.statusText}`);
}

export async function stopSession(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/stop`), {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return res.ok;
  } catch { return false; }
}

export async function resolveSessionApproval(sessionId: string, commandId: string, allowed: boolean): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl(`/api/sessions/${encodeURIComponent(sessionId)}/approvals`), {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ commandId, allowed }),
    });
    return res.ok;
  } catch { return false; }
}

export async function fetchPlans(): Promise<PlanSummary[]> {
  if (!hasLiveServer()) return [];
  const res = await fetch(buildApiUrl('/api/plans'), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch plans: ${res.statusText}`);
  return ((await res.json()) as { plans: PlanSummary[] }).plans;
}

export async function fetchPlanDetail(name: string): Promise<PlanDetail> {
  if (!hasLiveServer()) throw new Error('No live server');
  const res = await fetch(buildApiUrl(`/api/plans/${encodeURIComponent(name)}`), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch plan detail: ${res.statusText}`);
  return ((await res.json()) as { plan: PlanDetail }).plan;
}
