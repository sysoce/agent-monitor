import { detectDiagramKind } from './diagramRenderer';
import { highlight } from '../highlight';

export function renderDiagramCardHtml(code: string, lang: string): string {
  const kind = detectDiagramKind(lang, code);
  const badge = kind === 'mermaid' ? 'Diagram' : 'Chart';
  const escapedCode = escapeHtmlAttr(code);
  const escapedLang = escapeHtmlAttr(lang);

  const pieces = highlight(code, lang);
  const highlighted = pieces
    .map((p) => (p.kind === 'plain' ? escapeHtml(p.value) : `<span class="tok-${p.kind}">${escapeHtml(p.value)}</span>`))
    .join('');

  return `
    <div class="diagram-card" data-diagram-lang="${escapedLang}" data-diagram-code="${escapedCode}">
      <div class="diagram-header">
        <div class="diagram-title-group">
          <span class="diagram-icon">📊</span>
          <span class="diagram-badge">${badge}</span>
        </div>
        <div class="diagram-actions">
          <button type="button" class="diagram-toggle-btn" title="Toggle source code">Code</button>
          <button type="button" class="diagram-copy-btn copy-btn" data-copy-text="${escapedCode}" title="Copy source">Copy</button>
        </div>
      </div>
      <div class="diagram-body">
        <div class="diagram-loading">Rendering diagram...</div>
      </div>
      <div class="diagram-source hidden">
        <pre><code class="language-${escapedLang}">${highlighted}</code></pre>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeHtmlAttr(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
