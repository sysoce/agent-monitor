import type { P2PSignalTransport } from './p2pClientCoordinator';
import type { GistSyncConfig } from '../sync/types';
import type { P2PSignalMessage } from './types';
import { postSignalToLan, fetchSignalsFromLan, postSignalToGist, fetchSignalsFromGist } from './p2pSignalingExchange';

export interface P2PSignalTransportOptions {
  baseUrl?: string;
  gistConfig?: GistSyncConfig;
  peerId?: string;
}

export function createP2PSignalTransport(options: P2PSignalTransportOptions): P2PSignalTransport {
  return {
    postSignal: async (signal: P2PSignalMessage): Promise<boolean> => {
      if (options.baseUrl) {
        const ok = await postSignalToLan(options.baseUrl, signal);
        if (ok) return true;
      }
      if (options.gistConfig) {
        return postSignalToGist(options.gistConfig, signal);
      }
      return false;
    },
    fetchSignals: async (): Promise<P2PSignalMessage[]> => {
      if (options.baseUrl) {
        const lanSignals = await fetchSignalsFromLan(options.baseUrl, options.peerId);
        if (lanSignals.length > 0) return lanSignals;
      }
      if (options.gistConfig) {
        return fetchSignalsFromGist(options.gistConfig);
      }
      return [];
    },
  };
}
