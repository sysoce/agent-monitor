import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { GistSyncConfig } from '../sync/types';
import { encodeSetupPayload } from '../sync/syncConfigLoader';
import { buildStandaloneHtml } from './standaloneTemplate';

export interface StandaloneExportOptions {
  outDir?: string;
  config?: GistSyncConfig;
  includeSetupHash?: boolean;
}

async function resolveDistDir(workspaceRoot: string): Promise<string> {
  const candidates = [
    path.join(workspaceRoot, 'dist'),
    path.join(workspaceRoot, 'dist', 'monitor'),
  ];
  for (const dir of candidates) {
    try {
      await fs.access(path.join(dir, 'index.html'));
      return dir;
    } catch {}
  }
  return candidates[0]!;
}

export async function exportStandaloneBundle(
  workspaceRoot: string,
  options: StandaloneExportOptions = {}
): Promise<string> {
  const distDir = await resolveDistDir(workspaceRoot);
  const outDir = options.outDir ? path.resolve(options.outDir) : distDir;
  await fs.mkdir(outDir, { recursive: true });
  const targetPath = path.join(outDir, 'standalone.html');

  const [rawHtml, rawCss, rawJs, svgIcon, manifestJson] = await Promise.all([
    fs.readFile(path.join(distDir, 'index.html'), 'utf8').catch(() => '<!DOCTYPE html><html><head><title>Agent Monitor</title></head><body><div id="app"></div></body></html>'),
    fs.readFile(path.join(distDir, 'monitor.css'), 'utf8').catch(() => ''),
    fs.readFile(path.join(distDir, 'bundle.js'), 'utf8').catch(() => ''),
    fs.readFile(path.join(distDir, 'icon.svg'), 'utf8').catch(() => ''),
    fs.readFile(path.join(distDir, 'manifest.webmanifest'), 'utf8').catch(() => ''),
  ]);

  const iconDataUri = svgIcon ? `data:image/svg+xml;base64,${Buffer.from(svgIcon).toString('base64')}` : undefined;
  const manifestDataUri = manifestJson ? `data:application/manifest+json;base64,${Buffer.from(manifestJson).toString('base64')}` : undefined;
  const setupPayload = options.config && options.includeSetupHash ? encodeSetupPayload(options.config) : undefined;

  const htmlContent = buildStandaloneHtml({
    html: rawHtml,
    css: rawCss,
    js: rawJs,
    iconDataUri,
    manifestDataUri,
    setupPayload,
  });

  await fs.writeFile(targetPath, htmlContent, 'utf8');
  return targetPath;
}
