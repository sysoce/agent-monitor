import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { GistSyncConfig } from '../sync/types';
import { encodeSetupPayload } from '../sync/syncConfigLoader';

export interface StandaloneExportOptions {
  outDir?: string;
  config?: GistSyncConfig;
  includeSetupHash?: boolean;
}

export async function exportStandaloneBundle(
  workspaceRoot: string,
  options: StandaloneExportOptions = {}
): Promise<string> {
  const distDir = path.join(workspaceRoot, 'dist', 'monitor');
  const sourcePath = path.join(distDir, 'standalone.html');
  const outDir = options.outDir ? path.resolve(options.outDir) : distDir;
  await fs.mkdir(outDir, { recursive: true });
  const targetPath = path.join(outDir, 'standalone.html');

  let htmlContent = '';
  try {
    htmlContent = await fs.readFile(sourcePath, 'utf8');
  } catch {
    // If standalone.html does not exist yet, build minimal fallback or read index.html
    const indexPath = path.join(distDir, 'index.html');
    const cssPath = path.join(distDir, 'monitor.css');
    const jsPath = path.join(distDir, 'bundle.js');
    const [rawHtml, rawCss, rawJs] = await Promise.all([
      fs.readFile(indexPath, 'utf8').catch(() => '<!DOCTYPE html><html><head><title>Agent Monitor</title></head><body><div id="app"></div></body></html>'),
      fs.readFile(cssPath, 'utf8').catch(() => ''),
      fs.readFile(jsPath, 'utf8').catch(() => ''),
    ]);
    htmlContent = rawHtml
      .replace('<link rel="stylesheet" href="/monitor.css" />', `<style>\n${rawCss}\n</style>`)
      .replace('<script src="/bundle.js"></script>', `<script>\n${rawJs}\n</script>`);
  }

  if (options.config && options.includeSetupHash) {
    const payload = encodeSetupPayload(options.config);
    htmlContent = htmlContent.replace('</head>', `<script>if(!window.location.hash) window.location.hash='#setup=${payload}';</script></head>`);
  }

  await fs.writeFile(targetPath, htmlContent, 'utf8');
  return targetPath;
}
