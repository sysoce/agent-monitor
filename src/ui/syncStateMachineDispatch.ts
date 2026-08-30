import type { SyncInboxMessage, TransportMode } from '../sync/types';
import type { GistClient } from '../sync/gistClient';
import type { P2PClientCoordinator } from '../p2p/p2pClientCoordinator';

export interface DispatchContext {
  p2pCoord: P2PClientCoordinator | null;
  gistClient?: GistClient;
  mode: TransportMode;
  autoFallback: boolean;
  pollOnce: () => Promise<void>;
}

export async function dispatchInboxMessage(
  ctx: DispatchContext,
  msg: SyncInboxMessage
): Promise<void> {
  if (ctx.p2pCoord?.isConnected()) {
    const adapter = ctx.p2pCoord.getAdapter();
    if (adapter) {
      await adapter.send({
        id: msg.id,
        type: 'user_input',
        sessionId: msg.sessionId,
        payload: msg,
        timestamp: Date.now(),
      });
      return;
    }
  }
  if (ctx.mode === 'p2p') {
    if (!ctx.autoFallback) {
      throw new Error('WebRTC P2P is not connected and auto-fallback is disabled.');
    }
    if (ctx.gistClient) {
      await ctx.gistClient.pushInboxMessage(msg);
      await ctx.pollOnce();
      return;
    }
    throw new Error('WebRTC P2P is not connected and Gist fallback is not configured.');
  }
  if (ctx.gistClient && ctx.mode === 'git-backup') {
    await ctx.gistClient.pushInboxMessage(msg);
    await ctx.pollOnce();
    return;
  }
  throw new Error('Gist client is not configured or transport mode is not available');
}
