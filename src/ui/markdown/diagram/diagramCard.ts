import type { DiagramCardOptions } from './diagramTypes';
import { renderDiagramSvg, detectDiagramKind } from './diagramRenderer';
import { copyCodeToClipboard } from '../copyHelper';

export function createDiagramCard(
  code: string,
  lang: string,
  options: DiagramCardOptions = {}
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'diagram-card';
  card.dataset.diagramLang = lang;
  card.dataset.diagramCode = code;

  const kind = detectDiagramKind(lang, code);
  const header = createCardHeader(kind, code, card, options);
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'diagram-body';
  body.innerHTML = '<div class="diagram-loading">Rendering diagram...</div>';
  card.appendChild(body);

  const source = createCardSource(code, lang);
  card.appendChild(source);

  renderDiagramSvg(lang, code).then((result) => {
    if (result.success && result.svg) {
      body.innerHTML = result.svg;
    } else {
      body.innerHTML = `<div class="diagram-fallback"><div class="diagram-error-hint">${escapeText(result.error || 'Diagram rendering issue')}</div></div>`;
      card.classList.add('diagram-card--error');
      source.classList.remove('hidden');
    }
  });

  return card;
}

function createCardHeader(
  kind: string,
  code: string,
  card: HTMLElement,
  options: DiagramCardOptions
): HTMLElement {
  const header = document.createElement('div');
  header.className = 'diagram-header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'diagram-title-group';
  titleGroup.innerHTML = `<span class="diagram-icon">📊</span><span class="diagram-badge">${kind === 'mermaid' ? 'Diagram' : 'Chart'}</span>`;
  header.appendChild(titleGroup);

  const actions = document.createElement('div');
  actions.className = 'diagram-actions';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'diagram-toggle-btn';
  toggleBtn.textContent = 'Code';
  toggleBtn.title = 'Toggle source code';
  toggleBtn.addEventListener('click', () => {
    const isSourceVisible = card.classList.toggle('show-source');
    toggleBtn.textContent = isSourceVisible ? 'Diagram' : 'Code';
    const sourceEl = card.querySelector('.diagram-source');
    sourceEl?.classList.toggle('hidden', !isSourceVisible);
  });
  actions.appendChild(toggleBtn);

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'diagram-copy-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.title = 'Copy diagram source';
  copyBtn.addEventListener('click', (e) => {
    copyCodeToClipboard(code, e.target as HTMLElement);
    options.onCopy?.(code);
  });
  actions.appendChild(copyBtn);

  header.appendChild(actions);
  return header;
}

function createCardSource(code: string, lang: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'diagram-source hidden';
  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  codeEl.className = `language-${lang}`;
  codeEl.textContent = code;
  pre.appendChild(codeEl);
  wrap.appendChild(pre);
  return wrap;
}

function escapeText(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
