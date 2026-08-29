import { type InlineNode, type LinkLike } from './inlineTypes';
import { parseLinkLike, AUTOLINK_RE } from './inlineLink';
import { parseEmphasis } from './inlineEmphasis';

export { type InlineNode, type LinkLike, parseLinkLike, parseEmphasis };

/**
 * Inline markdown parser.
 * Code spans bind tightest and are scanned first, so backticked text is never
 * reinterpreted as emphasis.
 */
export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = '';
  let i = 0;

  const flush = () => {
    if (buffer) {
      nodes.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  while (i < source.length) {
    const char = source[i];

    if (char === '\\' && i + 1 < source.length) {
      buffer += source[i + 1];
      i += 2;
      continue;
    }

    if (char === '\n') {
      flush();
      nodes.push({ type: 'break' });
      i += 1;
      continue;
    }

    if (char === '`') {
      const run = /^`+/.exec(source.slice(i))![0];
      const close = source.indexOf(run, i + run.length);
      if (close !== -1) {
        flush();
        nodes.push({ type: 'code', value: source.slice(i + run.length, close).trim() });
        i = close + run.length;
        continue;
      }
    }

    if (char === '!' && source[i + 1] === '[') {
      const parsed = parseLinkLike(source, i + 1);
      if (parsed) {
        flush();
        nodes.push({ type: 'image', src: parsed.href, alt: parsed.label });
        i = parsed.end;
        continue;
      }
    }

    if (char === '[') {
      const parsed = parseLinkLike(source, i);
      if (parsed) {
        flush();
        nodes.push({
          type: 'link',
          href: parsed.href,
          title: parsed.title,
          children: parseInline(parsed.label),
        });
        i = parsed.end;
        continue;
      }
    }

    if (char === '*' || char === '_') {
      const emphasis = parseEmphasis(source, i, char, parseInline);
      if (emphasis) {
        flush();
        nodes.push(emphasis.node);
        i = emphasis.end;
        continue;
      }
    }

    if (char === '~' && source[i + 1] === '~') {
      const close = source.indexOf('~~', i + 2);
      if (close !== -1) {
        flush();
        nodes.push({ type: 'strike', children: parseInline(source.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }

    if ((char === 'h' || char === 'H' || char === 'f' || char === 'F' || char === 'v' || char === 'V') && (i === 0 || /[\s(]/.test(source[i - 1]))) {
      const match = AUTOLINK_RE.exec(source.slice(i));
      if (match) {
        flush();
        nodes.push({
          type: 'link',
          href: match[1],
          children: [{ type: 'text', value: match[1] }],
        });
        i += match[1].length;
        continue;
      }
    }

    buffer += char;
    i += 1;
  }

  flush();
  return nodes;
}
