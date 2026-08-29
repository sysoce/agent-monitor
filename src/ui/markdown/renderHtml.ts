import type { BlockToken } from './tokenizeTypes';
import type { InlineNode } from './inlineTypes';
import { parseInline } from './inline';
import { classifyLoneBoldText } from './boldParagraph';
import { isFilePathCandidate } from './filePathDetector';
import { isPlanFilePath } from './planPathDetector';
import { highlight } from './highlight';
import { isDiagramLanguage } from './diagram/diagramRenderer';
import { renderDiagramCardHtml } from './diagram/diagramCardHtml';

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderInlineHtml(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return escapeHtml(node.value).replace(
            /(^|[\s(>])([a-zA-Z0-9_\-./]*plan[a-zA-Z0-9_\-./]*\.md|[a-zA-Z0-9_\-./]+\.plan\.md)(?=[)\s.,;:<]|$)/gi,
            (_m, prefix, file) => {
              if (isPlanFilePath(file)) {
                return `${prefix}<button type="button" class="plan-view-btn md-plan-link" data-plan-path="${file}">📋 ${file}</button>`;
              }
              return `${prefix}${file}`;
            }
          );
        case 'break':
          return '<br />';
        case 'code':
          if (isFilePathCandidate(node.value)) {
            return `<code class="inline-code inline-code--link" data-file-path="${escapeHtml(node.value)}" title="Open ${escapeHtml(node.value)}">${escapeHtml(node.value)}</code>`;
          }
          return `<code class="inline-code">${escapeHtml(node.value)}</code>`;
        case 'strong':
          return `<strong>${renderInlineHtml(node.children)}</strong>`;
        case 'em':
          return `<em>${renderInlineHtml(node.children)}</em>`;
        case 'strike':
          return `<s>${renderInlineHtml(node.children)}</s>`;
        case 'image':
          return `<img class="md-image" src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}" />`;
        case 'link': {
          const cleanUrl = node.href.replace(/^file:\/\//, '');
          if (isPlanFilePath(cleanUrl)) {
            return `<button type="button" class="plan-view-btn md-plan-link" data-plan-path="${escapeHtml(cleanUrl)}">📋 ${renderInlineHtml(node.children)}</button>`;
          }
          const titleAttr = node.title ? ` title="${escapeHtml(node.title)}"` : '';
          return `<a href="${escapeHtml(node.href)}" target="_blank" rel="noopener" class="md-link"${titleAttr}>${renderInlineHtml(node.children)}</a>`;
        }
        default:
          return '';
      }
    })
    .join('');
}

function renderCodeBlockHtml(code: string, lang: string): string {
  const displayLang = lang || 'text';
  const pieces = highlight(code, lang);
  const highlighted = pieces
    .map((p) => (p.kind === 'plain' ? escapeHtml(p.value) : `<span class="tok-${p.kind}">${escapeHtml(p.value)}</span>`))
    .join('');
  return `<div class="code-block"><div class="code-header"><span class="code-lang">${escapeHtml(displayLang)}</span><button type="button" class="code-copy-btn copy-btn" data-copy-text="${escapeHtml(code)}" title="Copy code">Copy</button></div><pre><code>${highlighted}</code></pre></div>`;
}

export function renderBlockTokenHtml(token: BlockToken): string {
  switch (token.type) {
    case 'heading':
      return `<h${token.level} class="md-heading md-h md-h${token.level} h${token.level}">${renderInlineHtml(parseInline(token.text))}</h${token.level}>`;
    case 'paragraph': {
      const inlines = parseInline(token.text);
      let pClass = 'md-paragraph md-p';
      if (inlines.length === 1 && inlines[0].type === 'strong') {
        const raw = token.text.replace(/^[*_]{2}|[*_]{2}$/g, '').trim();
        const kind = classifyLoneBoldText(raw);
        if (kind === 'title') pClass += ' md-bold-title';
        else if (kind === 'status') pClass += ' md-status-label';
      }
      return `<p class="${pClass}">${renderInlineHtml(inlines)}</p>`;
    }
    case 'hr':
      return '<hr class="md-hr" />';
    case 'quote':
      return `<blockquote class="md-quote">${renderInlineHtml(parseInline(token.text))}</blockquote>`;
    case 'code':
      return isDiagramLanguage(token.lang) ? renderDiagramCardHtml(token.code, token.lang) : renderCodeBlockHtml(token.code, token.lang);
    case 'list': {
      const isCheck = token.items.some((i) => i.checked !== undefined);
      if (isCheck) {
        const items = token.items
          .map((i) => `<li class="checklist-item ${i.checked ? 'done' : ''}"><span class="check-box ${i.checked ? 'checked' : ''}">${i.checked ? '✓' : '○'}</span> ${renderInlineHtml(parseInline(i.text))}</li>`)
          .join('\n');
        return `<ul class="md-checklist">\n${items}\n</ul>`;
      }
      const tag = token.kind === 'ordered' ? 'ol' : 'ul';
      const listClass = token.kind === 'ordered' ? 'md-ol' : 'md-ul';
      const items = token.items.map((i) => `<li>${renderInlineHtml(parseInline(i.text))}</li>`).join('\n');
      return `<${tag} class="${listClass}">\n${items}\n</${tag}>`;
    }
    case 'table': {
      const thead = `<thead><tr>${token.header.map((col, idx) => `<th${token.align[idx] ? ` align="${token.align[idx]}"` : ''}>${renderInlineHtml(parseInline(col))}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${token.rows.map((row) => `<tr>${row.map((cell, idx) => `<td${token.align[idx] ? ` align="${token.align[idx]}"` : ''}>${renderInlineHtml(parseInline(cell))}</td>`).join('')}</tr>`).join('')}</tbody>`;
      return `<div class="md-table-wrap"><table class="md-table">${thead}${tbody}</table></div>`;
    }
    default:
      return '';
  }
}
