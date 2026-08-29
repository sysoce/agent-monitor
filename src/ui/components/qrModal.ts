import type { AppState } from '../types';
import { renderSettingsModal } from './settingsModal';
import {
  buildSettingsQrUrl,
  getCurrentClientPayload,
  type QrTarget,
  type BuildQrUrlOptions,
} from './settingsModal/index';

export type { QrTarget, BuildQrUrlOptions };
export { getCurrentClientPayload };

export function buildQrSetupUrl(opts: BuildQrUrlOptions): string {
  return buildSettingsQrUrl(opts);
}

export function renderQrModal(state: AppState): string {
  return renderSettingsModal(state);
}
