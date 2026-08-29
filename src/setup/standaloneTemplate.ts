export interface StandaloneTemplateOptions {
  html: string;
  css: string;
  js: string;
  iconDataUri?: string;
  manifestDataUri?: string;
  setupPayload?: string;
}

export function buildStandaloneHtml(options: StandaloneTemplateOptions): string {
  const safeJs = options.js.replace(/<\/script/gi, '<\\/script');
  const safeCss = options.css.replace(/<\/style/gi, '<\\/style');

  let html = options.html;
  if (options.iconDataUri) {
    html = html.replace(/href="\/icon\.svg"/g, `href="${options.iconDataUri}"`);
  }
  if (options.manifestDataUri) {
    html = html.replace('href="/manifest.webmanifest"', `href="${options.manifestDataUri}"`);
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

  let output = html
    .replace('<link rel="stylesheet" href="/monitor.css" />', '')
    .replace('<script src="/bundle.js"></script>', () => bootloader);

  if (options.setupPayload) {
    output = output.replace('</head>', `<script>if(!window.location.hash) window.location.hash='#setup=${options.setupPayload}';</script></head>`);
  }

  return output;
}
