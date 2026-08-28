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

    const safeJs = js.replace(/<\/script/gi, '<\\/script');
    const safeCss = css.replace(/<\/style/gi, '<\\/style');

    let standalone = html;
    if (iconDataUri) {
      standalone = standalone.replace(/href="(\/|\.\/)?icon\.svg"/g, `href="${iconDataUri}"`);
    }
    if (manifestDataUri) {
      standalone = standalone.replace(/href="(\/|\.\/)?manifest\.webmanifest"/g, `href="${manifestDataUri}"`);
    }

    const bootloader = `
  <style id="agent-monitor-style">
${safeCss}
  </style>
  <script id="agent-monitor-bundle-fallback" type="text/plain">
${safeJs}
  </script>
  <script>
  (function() {
    var K_JS = 'agent_monitor_cached_js';
    var K_CSS = 'agent_monitor_cached_css';
    var GH_PAGES = 'https://sysoce.github.io/agent-monitor';
    var CDN_FALLBACK = 'https://cdn.jsdelivr.net/gh/sysoce/agent-monitor@master/dist';

    var booted = false;
    function boot(code) {
      if (booted || !code) return;
      booted = true;
      try {
        var s = document.createElement('script');
        s.textContent = code;
        document.body.appendChild(s);
      } catch (e) {
        console.error('[Bootloader] Boot failure:', e);
      }
    }

    try {
      var cachedCss = localStorage.getItem(K_CSS);
      if (cachedCss) {
        var styleEl = document.getElementById('agent-monitor-style');
        if (styleEl) styleEl.textContent = cachedCss;
      }
      var cachedJs = localStorage.getItem(K_JS);
      if (cachedJs) {
        boot(cachedJs);
      } else {
        var fb = document.getElementById('agent-monitor-bundle-fallback');
        if (fb && fb.textContent) boot(fb.textContent);
      }
    } catch (e) {
      var fallback = document.getElementById('agent-monitor-bundle-fallback');
      if (fallback && fallback.textContent) boot(fallback.textContent);
    }

    async function checkRemote() {
      if (typeof fetch === 'undefined' || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
      var urls = [
        { css: GH_PAGES + '/monitor.css', js: GH_PAGES + '/bundle.js' },
        { css: CDN_FALLBACK + '/monitor.css', js: CDN_FALLBACK + '/bundle.js' }
      ];
      for (var i = 0; i < urls.length; i++) {
        try {
          var bust = '?_v=' + Date.now();
          var results = await Promise.all([
            fetch(urls[i].css + bust, { cache: 'no-cache' }),
            fetch(urls[i].js + bust, { cache: 'no-cache' })
          ]);
          if (results[0].ok && results[1].ok) {
            var newCss = await results[0].text();
            var newJs = await results[1].text();
            if (newJs && newJs.length > 500) {
              var currJs = localStorage.getItem(K_JS) || document.getElementById('agent-monitor-bundle-fallback')?.textContent;
              if (newJs !== currJs) {
                localStorage.setItem(K_CSS, newCss);
                localStorage.setItem(K_JS, newJs);
                console.log('[Bootloader] New Agent Monitor version cached from GitHub.');
              }
              break;
            }
          }
        } catch (err) {}
      }
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('load', function() {
        setTimeout(checkRemote, 1200);
      });
    }
  })();
  </script>`;

    standalone = standalone
      .replace(/<link rel="stylesheet" href="(\/|\.\/)?monitor\.css" \/>/g, '')
      .replace(/<script src="(\/|\.\/)?bundle\.js"><\/script>/g, bootloader);

    writeFileSync('dist/standalone.html', standalone, 'utf8');
    writeFileSync('dist/index.html', standalone, 'utf8');
    writeFileSync('index.html', standalone, 'utf8');
    try {
      chmodSync('dist/cli.js', 0o755);
    } catch {}
    console.log('[build] dist/standalone.html, dist/index.html, and index.html generated successfully.');
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
