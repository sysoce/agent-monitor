import type { IncomingMessage, ServerResponse } from 'node:http';
import { listSessions, getSessionDetail, createSession, stopSession } from './sessionStore';
import { resolveSessionApproval } from './sessionApprovals';
import { listPlans, getPlan } from './planStore';
import { queryWorkspaceMentions } from './mentionStore';
import { enqueueSessionMessage } from './messageQueue';
import { getMonitorModelCatalog } from './modelsCatalog';
import type { SseEmitter } from './sseEmitter';
import type { GistSyncConfig } from '../sync/types';
import { isRequestAuthorized } from './auth';
import { readJsonBody, sendJson, handleAuthRoutes } from './authRoutes';
import { serveStaticFile } from './staticHandler';
import { handleSetupRoute } from './setupHandler';
import { handleAttachmentRoute } from './attachmentHandler';
import { handleP2PSignalRoute } from './p2pSignalRouter';
import type { AttachmentItem } from '../types';

export { readJsonBody };

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  workspaceRoot: string,
  staticDir: string,
  sse: SseEmitter,
  password?: string,
  syncConfig?: GistSyncConfig
): Promise<void> {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;
  if (pathname.startsWith('/api/')) console.log(`[${new Date().toISOString()}] [API ${req.method}] ${pathname}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
    res.end();
    return;
  }

  if (await handleAuthRoutes(req, res, pathname, url, password, syncConfig)) return;
  if (await handleSetupRoute(res, pathname, url, workspaceRoot, staticDir, password, syncConfig)) return;
  if (await handleP2PSignalRoute(req, res, pathname, url)) return;
  if (pathname === '/' || pathname === '/index.html') return serveStaticFile(req, res, staticDir, 'index.html', 'text/html; charset=utf-8');
  if (pathname === '/bundle.js') return serveStaticFile(req, res, staticDir, 'bundle.js', 'application/javascript');
  if (pathname === '/monitor.css') return serveStaticFile(req, res, staticDir, 'monitor.css', 'text/css');
  if (pathname === '/manifest.webmanifest' || pathname === '/manifest.json') return serveStaticFile(req, res, staticDir, 'manifest.webmanifest', 'application/manifest+json');
  if (pathname === '/icon.svg') return serveStaticFile(req, res, staticDir, 'icon.svg', 'image/svg+xml');
  if (pathname === '/standalone.html') return serveStaticFile(req, res, staticDir, 'standalone.html', 'text/html; charset=utf-8');

  if (password && !isRequestAuthorized(req, password, url)) {
    sendJson(res, 401, { error: 'Unauthorized', authRequired: true }, req);
    return;
  }

  if (await handleAttachmentRoute(req, res, url, workspaceRoot)) return;
  if (pathname === '/api/events') { sse.addClient(res); return; }
  if (pathname === '/api/models' && req.method === 'GET') {
    const catalog = getMonitorModelCatalog();
    sendJson(res, 200, { models: catalog.models, groups: catalog.groups, currentProvider: catalog.currentProvider }, req);
    return;
  }
  if (pathname === '/api/mentions' && req.method === 'GET') {
    const q = url.searchParams.get('q') || '';
    sendJson(res, 200, { mentions: await queryWorkspaceMentions(workspaceRoot, q) }, req);
    return;
  }

  if (pathname === '/api/sessions' && req.method === 'GET') return sendJson(res, 200, { sessions: await listSessions(workspaceRoot) }, req);
  if (pathname === '/api/sessions' && req.method === 'POST') {
    const body = await readJsonBody<{ title?: string }>(req);
    sendJson(res, 201, { id: await createSession(workspaceRoot, body.title), ok: true }, req);
    return;
  }

  const sessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (sessionMatch && req.method === 'GET') {
    const detail = await getSessionDetail(workspaceRoot, sessionMatch[1]!);
    if (!detail) return sendJson(res, 404, { error: 'Session not found' }, req);
    return sendJson(res, 200, { session: detail }, req);
  }

  const stopMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/stop$/);
  if (stopMatch && req.method === 'POST') {
    const ok = await stopSession(workspaceRoot, stopMatch[1]!);
    sse.broadcast('change', { timestamp: Date.now() });
    return sendJson(res, 200, { ok }, req);
  }

  const approvalMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/approvals$/);
  if (approvalMatch && req.method === 'POST') {
    const body = await readJsonBody<{ commandId: string; allowed: boolean }>(req);
    const ok = await resolveSessionApproval(workspaceRoot, approvalMatch[1]!, body.commandId, Boolean(body.allowed));
    return sendJson(res, 200, { ok }, req);
  }

  const msgMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/messages$/);
  if (msgMatch && req.method === 'POST') {
    const body = await readJsonBody<{ content: string; role?: 'user' | 'assistant'; model?: string; mode?: string; attachments?: AttachmentItem[]; timestamp?: number }>(req);
    if (!body.content?.trim() && (!body.attachments || body.attachments.length === 0)) return sendJson(res, 400, { error: 'Content or attachments required' }, req);
    await enqueueSessionMessage({
      workspaceRoot,
      sessionId: msgMatch[1]!,
      content: body.content?.trim() || '',
      role: body.role,
      model: body.model,
      mode: body.mode,
      attachments: body.attachments,
      timestamp: body.timestamp,
    });
    return sendJson(res, 200, { ok: true }, req);
  }

  if (pathname === '/api/plans' && req.method === 'GET') return sendJson(res, 200, { plans: await listPlans(workspaceRoot) }, req);
  const planMatch = pathname.match(/^\/api\/plans\/([^/]+)$/);
  if (planMatch && req.method === 'GET') {
    const plan = await getPlan(workspaceRoot, decodeURIComponent(planMatch[1]!));
    if (!plan) return sendJson(res, 404, { error: 'Plan not found' }, req);
    return sendJson(res, 200, { plan }, req);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}
