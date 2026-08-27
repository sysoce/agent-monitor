import type { DiagramKind, DiagramRenderResult, DiagramTheme } from './diagramTypes';
import { renderMermaidSvg } from './mermaidRenderer';
import { parseChartSpec } from './chartParser';
import { renderChartToSvg } from './chartSvgRenderer';

const DIAGRAM_LANGS = /^(?:mermaid|chart|charts|chartjs|pie-chart|bar-chart|line-chart|area-chart|doughnut-chart)$/i;

export function isDiagramLanguage(lang?: string): boolean {
  if (!lang) return false;
  return DIAGRAM_LANGS.test(lang.trim());
}

export function detectDiagramKind(lang: string, code?: string): DiagramKind {
  const l = (lang || '').trim().toLowerCase();
  if (l === 'mermaid') return 'mermaid';
  if (l.includes('chart')) return 'chart';
  if (code && /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|xychart-beta|sankey-beta|packet-beta|block-beta|kanban|architecture-beta)\b/m.test(code)) {
    return 'mermaid';
  }
  return 'chart';
}

export async function renderDiagramSvg(
  lang: string,
  code: string,
  theme?: DiagramTheme
): Promise<DiagramRenderResult> {
  const kind = detectDiagramKind(lang, code);

  if (kind === 'mermaid') {
    return renderMermaidSvg(code, theme);
  }

  try {
    const spec = parseChartSpec(code, lang);
    const svg = renderChartToSvg(spec);
    return { success: true, svg, diagramKind: 'chart' };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to parse chart data',
      diagramKind: 'chart',
    };
  }
}
