import { renderDiagramSvg } from './diagramRenderer';
import { copyCodeToClipboard } from '../copyHelper';

export async function hydrateAllDiagrams(root: ParentNode = document): Promise<void> {
  if (typeof document === 'undefined') return;
  const cards = root.querySelectorAll<HTMLElement>('.diagram-card:not([data-hydrated="true"])');

  for (const card of Array.from(cards)) {
    hydrateSingleDiagram(card);
  }
}

export async function hydrateSingleDiagram(card: HTMLElement): Promise<void> {
  card.setAttribute('data-hydrated', 'true');
  const code = card.dataset.diagramCode || '';
  const lang = card.dataset.diagramLang || 'mermaid';
  const body = card.querySelector<HTMLElement>('.diagram-body');
  const source = card.querySelector<HTMLElement>('.diagram-source');
  const toggleBtn = card.querySelector<HTMLElement>('.diagram-toggle-btn');
  const copyBtn = card.querySelector<HTMLElement>('.diagram-copy-btn');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = card.classList.toggle('show-source');
      toggleBtn.textContent = isVisible ? 'Diagram' : 'Code';
      source?.classList.toggle('hidden', !isVisible);
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyCodeToClipboard(code, copyBtn);
    });
  }

  if (!body) return;

  const result = await renderDiagramSvg(lang, code);
  if (result.success && result.svg) {
    body.innerHTML = result.svg;
  } else {
    body.innerHTML = `<div class="diagram-fallback"><div class="diagram-error-hint">${escapeText(result.error || 'Diagram rendering issue')}</div></div>`;
    card.classList.add('diagram-card--error');
    source?.classList.remove('hidden');
  }
}

function escapeText(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
