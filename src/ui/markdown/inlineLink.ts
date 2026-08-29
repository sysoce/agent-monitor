import type { LinkLike } from './inlineTypes';

export const AUTOLINK_RE = /^((?:https?|file|vscode):\/\/[^\s<>()]+[^\s<>().,;:!?'"])/i;

export function parseLinkLike(source: string, start: number): LinkLike | undefined {
  let depth = 0;
  let labelEnd = -1;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (char === '\\') {
      i += 1;
      continue;
    }
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        labelEnd = i;
        break;
      }
    }
  }
  if (labelEnd === -1 || source[labelEnd + 1] !== '(') return undefined;

  let parenDepth = 0;
  let hrefEnd = -1;
  for (let i = labelEnd + 1; i < source.length; i += 1) {
    const char = source[i];
    if (char === '(') parenDepth += 1;
    else if (char === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        hrefEnd = i;
        break;
      }
    }
  }
  if (hrefEnd === -1) return undefined;

  const inner = source.slice(labelEnd + 2, hrefEnd).trim();
  const titleMatch = inner.match(/^(\S+)\s+["'](.*)["']$/);

  return {
    label: source.slice(start + 1, labelEnd),
    href: titleMatch ? titleMatch[1] : inner,
    title: titleMatch ? titleMatch[2] : undefined,
    end: hrefEnd + 1,
  };
}
