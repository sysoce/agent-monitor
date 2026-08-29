export type QrTarget = 'gh_pages' | 'lan' | 'download';

export interface BuildQrUrlOptions {
  target: QrTarget;
  payload?: string;
  origin?: string;
  customGhPagesUrl?: string;
  customLanUrl?: string;
  selectedLanIp?: string;
}

export { buildSettingsQrUrl, getCurrentClientPayload } from './settingsQrBuilder';
