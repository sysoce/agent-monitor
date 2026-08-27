import { isPlanFilePath } from '../../utils/planExtractor';
import { highlight } from '../markdown/highlight';
import { isDiagramLanguage } from '../markdown/diagram/diagramRenderer';
import { renderDiagramCardHtml } from '../markdown/diagram/diagramCardHtml';

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function formatInlineMarkdown(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const cleanUrl = url.replace(/^file:\/\//, '');
    if (isPlanFilePath(cleanUrl)) {
      return `<button type="button" class="plan-view-btn md-plan-link" data-plan-path="${cleanUrl}">📋 ${label}</button>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener" class="md-link">${label}</a>`;
  });
  html = html.replace(/(^|[\s(>])([a-zA-Z0-9_\-./]*plan[a-zA-Z0-9_\-./]*\.md|[a-zA-Z0-9_\-./]+\.plan\.md)(?=[)\s.,;:<]|$)/gi, (_m, prefix, file) => {
    if (isPlanFilePath(file)) {
      return `${prefix}<button type="button" class="plan-view-btn md-plan-link" data-plan-path="${file}">📋 ${file}</button>`;
    }
    return `${prefix}${file}`;
  });
  return html;
}

function renderCodeBlockHtml(code: string, lang: string): string {
  const displayLang = lang || 'text';
  const pieces = highlight(code, lang);
  const highlighted = pieces
    .map((p) => (p.kind === 'plain' ? escapeHtml(p.value) : `<span class="tok-${p.kind}">${escapeHtml(p.value)}</span>`))
    .join('');
  return `
    <div class="code-block">
      <div class="code-header">
        <span class="code-lang">${escapeHtml(displayLang)}</span>
        <button type="button" class="code-copy-btn copy-btn" data-copy-text="${escapeHtml(code)}" title="Copy code">Copy</button>
      </div>
      <pre><code>${highlighted}</code></pre>
    </div>
  `;
}

function renderBlock(line: string): { type: string; html: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (/^(\*\*\*|---|___)$/.test(trimmed)) return { type: 'hr', html: '<hr class="md-hr" />' };

  const hm = trimmed.match(/^(#{1,6})\s+(.*)$/);
  if (hm) return { type: 'h', html: `<h${hm[1]!.length} class="md-h md-h${hm[1]!.length}">${formatInlineMarkdown(hm[2]!)}</h${hm[1]!.length}>` };

  const check = trimmed.match(/^-\s+\[([ xX])\]\s+(.*)$/);
  if (check) {
    const checked = check[1]!.toLowerCase() === 'x';
    return {
      type: 'checklist',
      html: `<li class="checklist-item ${checked ? 'done' : ''}"><span class="check-box ${checked ? 'checked' : ''}">${checked ? '✓' : '○'}</span> ${formatInlineMarkdown(check[2]!)}</li>`,
    };
  }

  const ul = trimmed.match(/^[-*]\s+(.*)$/);
  if (ul) return { type: 'ul', html: `<li>${formatInlineMarkdown(ul[1]!)}</li>` };

  const ol = trimmed.match(/^(\d+\.|[A-Za-z]\.)\s+(.*)$/);
  if (ol) return { type: 'ol', html: `<li>${formatInlineMarkdown(ol[2]!)}</li>` };

  const quote = trimmed.match(/^>\s*(.*)$/);
  if (quote) return { type: 'quote', html: `<blockquote class="md-quote">${formatInlineMarkdown(quote[1]!)}</blockquote>` };

  return { type: 'p', html: formatInlineMarkdown(trimmed) };
}

export function renderMarkdownDocument(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let listType: 'ul' | 'ol' | 'checklist' | null = null;
  let pLines: string[] = [];

  const flushP = () => {
    if (pLines.length) {
      out.push(`<p class="md-p">${pLines.join(' ')}</p>`);
      pLines = [];
    }
  };
  const closeList = () => {
    if (listType) {
      out.push(listType === 'ol' ? '</ol>' : '</ul>');
      listType = null;
    }
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('```')) {
      flushP();
      closeList();
      if (inCode) {
        const fullCode = codeLines.join('\n');
        out.push(isDiagramLanguage(codeLang) ? renderDiagramCardHtml(fullCode, codeLang) : renderCodeBlockHtml(fullCode, codeLang));
        inCode = false;
        codeLang = '';
        codeLines = [];
      } else {
        inCode = true;
        codeLang = trimmed.slice(3).trim();
        codeLines = [];
      }
      continue;
    }
    if (inCode) {
      codeLines.push(raw);
      continue;
    }
    const block = renderBlock(raw);
    if (!block) {
      flushP();
      closeList();
      continue;
    }
    if (block.type === 'checklist' || block.type === 'ul' || block.type === 'ol') {
      flushP();
      if (listType !== block.type) {
        closeList();
        listType = block.type as 'ul' | 'ol' | 'checklist';
        out.push(listType === 'ol' ? '<ol class="md-ol">' : listType === 'checklist' ? '<ul class="md-checklist">' : '<ul class="md-ul">');
      }
      out.push(block.html);
    } else if (block.type === 'p') {
      closeList();
      pLines.push(block.html);
    } else {
      flushP();
      closeList();
      out.push(block.html);
    }
  }
  flushP();
  closeList();
  return out.join('\n');
}
