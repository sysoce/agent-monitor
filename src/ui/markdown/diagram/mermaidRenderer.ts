import type { DiagramRenderResult, DiagramTheme } from './diagramTypes';

let mermaidInitialized = false;
let mermaidModule: any = null;
let diagramSeq = 0;

export function resolveDiagramTheme(): DiagramTheme {
  if (typeof document === 'undefined') return 'dark';
  const body = document.body;
  const isLight = body.classList.contains('vscode-light') || document.documentElement.getAttribute('data-theme') === 'light';
  return isLight ? 'default' : 'dark';
}

async function loadMermaidScript(): Promise<any> {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (w.AgentMermaid || w.mermaid) return w.AgentMermaid?.default || w.AgentMermaid || w.mermaid;

  const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[];
  const panelScript = scripts.find((s) => s.src && s.src.includes('panel.js'));
  const mermaidSrc = panelScript
    ? panelScript.src.replace(/panel\.js(?:\?.*)?$/, 'mermaid.js')
    : 'mermaid.js';

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = mermaidSrc;
    script.async = true;
    script.onload = () => {
      resolve(w.AgentMermaid?.default || w.AgentMermaid || w.mermaid || null);
    };
    script.onerror = () => {
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

async function getMermaidInstance() {
  if (mermaidModule) return mermaidModule;
  if (typeof window !== 'undefined') {
    const instance = await loadMermaidScript();
    if (instance) {
      mermaidModule = instance;
      return mermaidModule;
    }
  }
  try {
    // @ts-ignore
    const mod = await import('mermaid');
    mermaidModule = mod.default || mod;
    return mermaidModule;
  } catch (err) {
    return null;
  }
}

export async function renderMermaidSvg(code: string, theme?: DiagramTheme): Promise<DiagramRenderResult> {
  const effectiveTheme = theme || resolveDiagramTheme();
  const id = `mermaid-diag-${Date.now()}-${++diagramSeq}`;

  try {
    const mermaid = await getMermaidInstance();
    if (!mermaid) {
      return { success: false, error: 'Mermaid library not loaded', diagramKind: 'mermaid' };
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: effectiveTheme,
      securityLevel: 'loose',
      fontFamily: 'inherit',
      suppressErrorRendering: true,
      flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: true },
      sequence: { useMaxWidth: true },
      gantt: { useMaxWidth: true },
    });

    const { svg } = await mermaid.render(id, code);
    return { success: true, svg: postProcessMermaidSvg(svg), diagramKind: 'mermaid' };
  } catch (err: any) {
    const fallbackEl = typeof document !== 'undefined' ? document.getElementById(id) || document.getElementById(`d${id}`) : null;
    fallbackEl?.remove();
    return {
      success: false,
      error: err?.message || 'Failed to render mermaid diagram',
      diagramKind: 'mermaid',
    };
  }
}

function postProcessMermaidSvg(svg: string): string {
  if (!svg) return '';
  return svg
    .replace(/style="[^"]*max-width:[^;"]*;?/gi, 'style="max-width:100%;height:auto;display:block;margin:0 auto;')
    .replace(/<svg\s+([^>]*)(width="[^"]*")([^>]*)>/i, '<svg $1 style="max-width:100%;height:auto;display:block;margin:0 auto;" $3>');
}
