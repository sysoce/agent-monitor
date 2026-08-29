import { tokenizeBlocks } from '../markdown/tokenize';
import { renderBlockTokenHtml, renderInlineHtml, escapeHtml } from '../markdown/renderHtml';
import { parseInline } from '../markdown/inline';

export { escapeHtml, renderInlineHtml };

export function formatInlineMarkdown(text: string): string {
  return renderInlineHtml(parseInline(text));
}

export function renderMarkdownDocument(content: string): string {
  const tokens = tokenizeBlocks(content);
  return tokens.map(renderBlockTokenHtml).filter(Boolean).join('\n');
}
