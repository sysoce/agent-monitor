import { highlight } from '../markdown/highlight';
import { escapeHtml } from './markdown';
import { COPY_ICON_SVG } from '../copyActions';

export interface DiffLine {
  type: 'context' | 'added' | 'deleted';
  lineNum?: number;
  content: string;
}

export interface DiffCardOptions {
  filePath: string;
  startLine?: number;
  lines?: DiffLine[];
  additions?: number;
  deletions?: number;
}

function getExtBadge(filePath: string): { label: string; className: string } {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  const map: Record<string, { label: string; className: string }> = {
    ts: { label: 'TS', className: 'badge-ts' },
    tsx: { label: 'TSX', className: 'badge-ts' },
    js: { label: 'JS', className: 'badge-js' },
    jsx: { label: 'JSX', className: 'badge-js' },
    css: { label: 'CSS', className: 'badge-css' },
    py: { label: 'PY', className: 'badge-py' },
    json: { label: 'JSON', className: 'badge-json' },
    md: { label: 'MD', className: 'badge-md' },
    html: { label: 'HTML', className: 'badge-html' },
    rs: { label: 'RS', className: 'badge-rs' },
    go: { label: 'GO', className: 'badge-go' },
  };
  return map[ext] || { label: ext.toUpperCase() || 'FILE', className: 'badge-default' };
}

function renderHighlightedContent(content: string, ext: string): string {
  const pieces = highlight(content || ' ', ext);
  return pieces
    .map((p) => (p.kind === 'plain' ? escapeHtml(p.value) : `<span class="tok-${p.kind}">${escapeHtml(p.value)}</span>`))
    .join('');
}

export function renderDiffCard(opts: DiffCardOptions): string {
  const badge = getExtBadge(opts.filePath);
  const fileName = opts.filePath.split(/[\\/]/).pop() || opts.filePath;
  const ext = (opts.filePath.split('.').pop() || '').toLowerCase();
  const lines = opts.lines || [];

  const statsHtml =
    (opts.additions || opts.deletions)
      ? `<span class="diff-stats">${opts.additions ? `<span class="diff-stat--add">+${opts.additions}</span>` : ''}${opts.deletions ? `<span class="diff-stat--del">-${opts.deletions}</span>` : ''}</span>`
      : '';

  const rawDiffText = lines
    .map((l) => `${l.type === 'deleted' ? '-' : l.type === 'added' ? '+' : ' '} ${l.content}`)
    .join('\n');

  const rowsHtml = lines
    .map((line) => {
      const sign = line.type === 'deleted' ? '-' : line.type === 'added' ? '+' : ' ';
      const lineNumStr = line.lineNum != null ? String(line.lineNum) : '';
      const codeHtml = renderHighlightedContent(line.content, ext);
      return `
        <div class="diff-row diff-row--${line.type}">
          <div class="diff-gutter">
            <span class="diff-line-num">${lineNumStr}</span>
            <span class="diff-line-sign">${sign}</span>
          </div>
          <div class="diff-line-code">${codeHtml}</div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="diff-card">
      <div class="diff-header">
        <div class="diff-header-left">
          <span class="diff-badge ${badge.className}">${badge.label}</span>
          <span class="diff-filename" title="${escapeHtml(opts.filePath)}">${escapeHtml(fileName)}</span>
          ${statsHtml}
        </div>
        <div class="diff-header-right">
          <button type="button" class="copy-btn copy-btn--compact diff-copy-btn"${rawDiffText ? ` data-copy-text="${escapeHtml(rawDiffText)}"` : ''} title="Copy diff content" aria-label="Copy diff content">${COPY_ICON_SVG}</button>
        </div>
      </div>
      <div class="diff-body">${rowsHtml}</div>
    </div>
  `;
}
