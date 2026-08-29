import type { GistSyncConfig } from '../sync/types';
import { P2PClientCoordinator } from '../p2p/p2pClientCoordinator';
import { createP2PSignalTransport } from '../p2p/p2pSignalTransportFactory';
import type { SyncStateMachineCallbacks, SyncStatus } from './syncStateMachineTypes';

export function startP2PCoordination(
  callbacks: SyncStateMachineCallbacks,
  gistConfig?: GistSyncConfig,
  liveServerUrl?: string
): P2PClientCoordinator | null {
  if (typeof RTCPeerConnection === 'undefined') {
    return null;
  }
  const transport = createP2PSignalTransport({ baseUrl: liveServerUrl, gistConfig });
  const coord = new P2PClientCoordinator({
    signalTransport: transport,
    onStatusChange: (status) => {
      let syncStatus: SyncStatus = 'disconnected';
      if (status === 'connected') syncStatus = 'connected';
      else if (status === 'connecting' || status === 'reconnecting') syncStatus = 'connecting';
      callbacks.onStatusChange(syncStatus);
    },
    onDataMessage: (msg) => {
      if (msg.type === 'session_update' && msg.payload) {
        callbacks.onDataUpdate(msg.payload);
      }
    },
  });
  void coord.start();
  return coord;
}
