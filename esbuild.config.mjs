import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

const isWatch = process.argv.includes('--watch');
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const serverConfig = {
  entryPoints: ['src/cli.ts'],
  bundle: true,
  outfile: 'dist/cli.js',
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
};

const serverLibConfig = {
  entryPoints: ['src/server/index.ts'],
  bundle: true,
  outfile: 'dist/server/server.js',
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
};

const uiConfig = {
  entryPoints: ['src/ui/entry.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  define: {
    __MONITOR_VERSION__: JSON.stringify(pkg.version),
  },
};

const cssConfig = {
  entryPoints: ['src/ui/monitor.css'],
  bundle: true,
  outfile: 'dist/monitor.css',
};

function copyAssets() {
  mkdirSync('dist', { recursive: true });
  mkdirSync('dist/media', { recursive: true });

  for (const [src, dst] of [
    ['src/ui/index.html', 'dist/index.html'],
    ['src/ui/manifest.webmanifest', 'dist/manifest.webmanifest'],
    ['media/icon.svg', 'dist/icon.svg'],
    ['media/icon.svg', 'dist/media/icon.svg'],
  ]) {
    try {
      cpSync(src, dst);
    } catch {}
  }
}

function buildStandaloneMonitor() {
  try {
    const html = readFileSync('dist/index.html', 'utf8');
    const css = readFileSync('dist/monitor.css', 'utf8');
    const js = readFileSync('dist/bundle.js', 'utf8');
    let svgIcon = '';
    try { svgIcon = readFileSync('dist/icon.svg', 'utf8'); } catch {}
    const iconDataUri = svgIcon ? `data:image/svg+xml;base64,${Buffer.from(svgIcon).toString('base64')}` : '';
    let manifestJson = '';
    try { manifestJson = readFileSync('dist/manifest.webmanifest', 'utf8'); } catch {}
    const manifestDataUri = manifestJson ? `data:application/manifest+json;base64,${Buffer.from(manifestJson).toString('base64')}` : '';

    let standalone = html
      .replace('<link rel="stylesheet" href="/monitor.css" />', `<style>\n${css}\n</style>`)
      .replace('<script src="/bundle.js"></script>', `<script>\n${js}\n</script>`);
    if (iconDataUri) {
      standalone = standalone.replace(/href="\/icon\.svg"/g, `href="${iconDataUri}"`);
    }
    if (manifestDataUri) {
      standalone = standalone.replace('href="/manifest.webmanifest"', `href="${manifestDataUri}"`);
    }

    writeFileSync('dist/standalone.html', standalone, 'utf8');
    writeFileSync('index.html', standalone, 'utf8');
    try {
      chmodSync('dist/cli.js', 0o755);
    } catch {}
    console.log('[build] dist/standalone.html and index.html generated successfully.');
  } catch (err) {
    console.warn('[build] Standalone monitor generation deferred:', err.message);
  }
}

async function buildAll() {
  copyAssets();
  await Promise.all([
    esbuild.build(serverConfig),
    esbuild.build(serverLibConfig),
    esbuild.build(uiConfig),
    esbuild.build(cssConfig),
  ]);
  buildStandaloneMonitor();
  console.log('[build] agent-monitor build complete.');
}

if (isWatch) {
  copyAssets();
  const ctxs = await Promise.all([
    esbuild.context(serverConfig),
    esbuild.context(serverLibConfig),
    esbuild.context(uiConfig),
    esbuild.context(cssConfig),
  ]);
  await Promise.all(ctxs.map((c) => c.watch()));
  buildStandaloneMonitor();
  console.log('[build] Watching for changes...');
} else {
  await buildAll();
}
